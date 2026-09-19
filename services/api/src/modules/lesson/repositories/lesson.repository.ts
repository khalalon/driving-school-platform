import { Pool } from 'pg';
import { Queryable } from '../../../db/transaction';
import {
  Lesson,
  LessonApproval,
  LessonFilters,
  LessonRefund,
  LessonScope,
  MarkAttendanceDTO,
  NewLessonRequest,
  NewScheduledLesson,
} from '../types/lesson.types';

export interface ILessonRepository {
  createRequest(data: NewLessonRequest): Promise<Lesson>;
  findById(id: string, executor?: Queryable): Promise<Lesson | null>;
  findAll(scope: LessonScope, filters: LessonFilters): Promise<Lesson[]>;
  /**
   * L5 : `pending` → `scheduled`, avec le règlement par l'avoir (D-40) ; `null` si la leçon
   * n'est plus `pending` (course entre instructeurs). `executor` : transaction du règlement.
   */
  approve(id: string, approval: LessonApproval, executor?: Queryable): Promise<Lesson | null>;
  /** L6 : `pending` → `rejected` ; `null` si la leçon n'est plus `pending`. */
  reject(id: string, reason: string): Promise<Lesson | null>;
  /**
   * L3 : `pending` ou `scheduled` → `cancelled` ; `null` si le statut a changé entre-temps.
   * Renvoie ce que l'élève avait versé et le crédit consommé, à lui restituer (D-40).
   */
  cancel(
    id: string,
    cancelledBy: string,
    reason?: string,
    executor?: Queryable
  ): Promise<LessonRefund | null>;
  /** L4 : leçon `scheduled` créée par l'instructeur pour un élève inscrit, avoir imputé (D-40). */
  createScheduled(data: NewScheduledLesson, executor?: Queryable): Promise<Lesson>;
  /**
   * L7 : `scheduled` → `completed` avec présence, retour et note ; `null` si la leçon n'est plus
   * `scheduled`. Renvoie aussi students.id pour les compteurs (D-33) et les montants versés
   * (restitués en cas d'absence, D-41).
   */
  markAttendance(
    id: string,
    dto: MarkAttendanceDTO,
    executor?: Queryable
  ): Promise<(LessonRefund & { studentRowId: string }) | null>;
}

/**
 * Fuseau de référence des écoles pour le filtre `date` de L1 (jour local). Les écoles n'ont pas
 * de fuseau propre en v1 (pilote tunisien, D-08) ; les timestamps sont stockés en UTC.
 */
export const SCHOOL_TIMEZONE = 'Africa/Tunis';

/** Schéma 007 ; identités par jointure `users` (élève via students, instructeur via instructors). */
const LESSON_COLUMNS = `l.id, l.school_id AS "schoolId", su.id AS "studentId",
  json_build_object('id', su.id, 'firstName', su.first_name, 'lastName', su.last_name) AS student,
  l.instructor_id AS "instructorId",
  CASE WHEN i.id IS NULL THEN NULL
       ELSE json_build_object('id', i.id, 'firstName', COALESCE(iu.first_name, ''),
                              'lastName', COALESCE(iu.last_name, '')) END AS instructor,
  l.preferred_instructor_id AS "preferredInstructorId", l.type, l.status,
  l.requested_date AS "requestedDate", l.scheduled_date AS "scheduledDate",
  l.duration_minutes AS "durationMinutes", l.price::float8 AS price, l.capacity,
  l.current_bookings AS "currentBookings", l.notes, l.admin_notes AS "adminNotes",
  l.rejection_reason AS "rejectionReason", l.cancellation_reason AS "cancellationReason",
  l.cancelled_by AS "cancelledBy", l.attended, l.feedback, l.rating, l.paid,
  l.amount::float8 AS amount, l.payment_date AS "paymentDate", l.payment_method AS "paymentMethod",
  l.credit_applied::float8 AS "creditApplied",
  l.created_at AS "createdAt", l.updated_at AS "updatedAt"`;

/** Ce qu'une annulation ou une absence doit restituer à l'élève (D-40, D-41). */
const REFUND_COLUMNS = `student_id AS "studentRowId",
  CASE WHEN paid THEN COALESCE(amount, 0) ELSE 0 END::float8 AS "paidAmount",
  credit_applied::float8 AS "creditApplied"`;

const LESSON_FROM = `FROM lessons l
  JOIN students s ON s.id = l.student_id
  JOIN users su ON su.id = s.user_id
  LEFT JOIN instructors i ON i.id = l.instructor_id
  LEFT JOIN users iu ON iu.id = i.user_id`;

export class LessonRepository implements ILessonRepository {
  constructor(private readonly db: Pool) {}

  /** L2 : demande `pending`, sans instructeur (D-32), capacité 1 (D-34). */
  async createRequest(data: NewLessonRequest): Promise<Lesson> {
    const inserted = await this.db.query<{ id: string }>(
      `INSERT INTO lessons (school_id, student_id, type, status, requested_date,
         preferred_instructor_id, notes, created_at, updated_at)
       VALUES ($1, $2, $3, 'pending', $4, $5, $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       RETURNING id`,
      [
        data.schoolId,
        data.studentRowId,
        data.type,
        data.requestedDate,
        data.preferredInstructorId ?? null,
        data.notes ?? null,
      ]
    );
    return this.requireById(inserted.rows[0].id);
  }

  async findById(id: string, executor: Queryable = this.db): Promise<Lesson | null> {
    const result = await executor.query<Lesson>(
      `SELECT ${LESSON_COLUMNS} ${LESSON_FROM} WHERE l.id = $1`,
      [id]
    );
    return result.rows[0] ?? null;
  }

  /**
   * L1. Portée : les leçons de l'élève ; pour un instructeur, les demandes `pending` de son école
   * (file partagée, D-32) et/ou les leçons dont il est l'instructeur ; tout pour un admin.
   * `date` : jour local (SCHOOL_TIMEZONE) de `scheduled_date`, ou de `requested_date` pour une
   * demande `pending`. Tri par date croissante.
   */
  async findAll(scope: LessonScope, filters: LessonFilters): Promise<Lesson[]> {
    const conditions: string[] = [];
    const values: unknown[] = [];
    const param = (value: unknown): string => {
      values.push(value);
      return `$${values.length}`;
    };

    if (scope.kind === 'student') {
      conditions.push(`l.student_id = ${param(scope.studentRowId)}`);
    } else if (scope.kind === 'instructor') {
      // Paramètres numérotés dans l'ordre d'apparition : chaque portée construit les siens.
      const pendingOfSchool = (): string =>
        `(l.school_id = ${param(scope.schoolId)} AND l.status = 'pending')`;
      const mine = (): string => `l.instructor_id = ${param(scope.instructorId)}`;
      if (scope.scope === 'school') conditions.push(pendingOfSchool());
      else if (scope.scope === 'mine') conditions.push(mine());
      else conditions.push(`(${pendingOfSchool()} OR ${mine()})`);
    }
    if (filters.status && filters.status.length > 0) {
      conditions.push(`l.status = ANY(${param(filters.status)})`);
    }
    if (filters.date) {
      const day = param(filters.date);
      conditions.push(
        `(COALESCE(l.scheduled_date, CASE WHEN l.status = 'pending' THEN l.requested_date END)
           AT TIME ZONE 'UTC' AT TIME ZONE '${SCHOOL_TIMEZONE}')::date = ${day}::date`
      );
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const result = await this.db.query<Lesson>(
      `SELECT ${LESSON_COLUMNS} ${LESSON_FROM} ${where}
       ORDER BY COALESCE(l.scheduled_date, l.requested_date) ASC, l.created_at ASC`,
      values
    );
    return result.rows;
  }

  async approve(
    id: string,
    approval: LessonApproval,
    executor: Queryable = this.db
  ): Promise<Lesson | null> {
    const { settlement } = approval;
    const result = await executor.query<{ id: string }>(
      `UPDATE lessons
       SET status = 'scheduled', instructor_id = $2, scheduled_date = $3, duration_minutes = $4,
           price = $5, admin_notes = $6,
           credit_applied = $7, paid = $8, amount = $9, payment_method = $10,
           payment_date = CASE WHEN $8 THEN CURRENT_TIMESTAMP ELSE payment_date END,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND status = 'pending'
       RETURNING id`,
      [
        id,
        approval.instructorId,
        approval.scheduledDate,
        approval.durationMinutes,
        approval.price,
        approval.adminNotes ?? null,
        settlement.creditApplied,
        settlement.paid,
        settlement.amount,
        settlement.paymentMethod,
      ]
    );
    return result.rows[0] ? this.requireById(id, executor) : null;
  }

  async reject(id: string, reason: string): Promise<Lesson | null> {
    const result = await this.db.query<{ id: string }>(
      `UPDATE lessons
       SET status = 'rejected', rejection_reason = $2, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND status = 'pending'
       RETURNING id`,
      [id, reason]
    );
    return result.rows[0] ? this.requireById(id) : null;
  }

  async cancel(
    id: string,
    cancelledBy: string,
    reason?: string,
    executor: Queryable = this.db
  ): Promise<LessonRefund | null> {
    const result = await executor.query<{ paidAmount: number; creditApplied: number }>(
      `UPDATE lessons
       SET status = 'cancelled', cancellation_reason = $2, cancelled_by = $3,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND status IN ('pending', 'scheduled')
       RETURNING ${REFUND_COLUMNS}`,
      [id, reason ?? null, cancelledBy]
    );
    const row = result.rows[0];
    if (!row) {
      return null;
    }
    return {
      lesson: await this.requireById(id, executor),
      paidAmount: row.paidAmount,
      creditApplied: row.creditApplied,
    };
  }

  async createScheduled(data: NewScheduledLesson, executor: Queryable = this.db): Promise<Lesson> {
    const { settlement } = data;
    const inserted = await executor.query<{ id: string }>(
      `INSERT INTO lessons (school_id, student_id, instructor_id, type, status, scheduled_date,
         duration_minutes, price, notes, credit_applied, paid, amount, payment_method,
         payment_date, created_at, updated_at)
       VALUES ($1, $2, $3, $4, 'scheduled', $5, $6, $7, $8, $9, $10, $11, $12,
               CASE WHEN $10 THEN CURRENT_TIMESTAMP END, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       RETURNING id`,
      [
        data.schoolId,
        data.studentRowId,
        data.instructorId,
        data.type,
        data.scheduledDate,
        data.durationMinutes,
        data.price,
        data.notes ?? null,
        settlement.creditApplied,
        settlement.paid,
        settlement.amount,
        settlement.paymentMethod,
      ]
    );
    return this.requireById(inserted.rows[0].id, executor);
  }

  async markAttendance(
    id: string,
    dto: MarkAttendanceDTO,
    executor: Queryable = this.db
  ): Promise<(LessonRefund & { studentRowId: string }) | null> {
    const result = await executor.query<{
      studentRowId: string;
      paidAmount: number;
      creditApplied: number;
    }>(
      `UPDATE lessons
       SET status = 'completed', attended = $2, feedback = $3, rating = $4,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND status = 'scheduled'
       RETURNING ${REFUND_COLUMNS}`,
      [id, dto.attended, dto.feedback ?? null, dto.rating ?? null]
    );
    const row = result.rows[0];
    if (!row) {
      return null;
    }
    return {
      lesson: await this.requireById(id, executor),
      studentRowId: row.studentRowId,
      paidAmount: row.paidAmount,
      creditApplied: row.creditApplied,
    };
  }

  /** Relecture avec les jointures après une écriture (RETURNING ne peut pas joindre). */
  protected async requireById(id: string, executor: Queryable = this.db): Promise<Lesson> {
    const lesson = await this.findById(id, executor);
    if (!lesson) {
      throw new Error(`Leçon ${id} introuvable après écriture`);
    }
    return lesson;
  }
}
