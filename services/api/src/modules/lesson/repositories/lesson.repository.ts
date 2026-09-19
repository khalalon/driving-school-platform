import { Pool } from 'pg';
import {
  Lesson,
  LessonApproval,
  LessonFilters,
  LessonScope,
  NewLessonRequest,
} from '../types/lesson.types';

export interface ILessonRepository {
  createRequest(data: NewLessonRequest): Promise<Lesson>;
  findById(id: string): Promise<Lesson | null>;
  findAll(scope: LessonScope, filters: LessonFilters): Promise<Lesson[]>;
  /** L5 : `pending` → `scheduled` ; `null` si la leçon n'est plus `pending` (course entre instructeurs). */
  approve(id: string, approval: LessonApproval): Promise<Lesson | null>;
  /** L6 : `pending` → `rejected` ; `null` si la leçon n'est plus `pending`. */
  reject(id: string, reason: string): Promise<Lesson | null>;
  /** L3 : `pending` ou `scheduled` → `cancelled` ; `null` si le statut a changé entre-temps. */
  cancel(id: string, cancelledBy: string, reason?: string): Promise<Lesson | null>;
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
  l.created_at AS "createdAt", l.updated_at AS "updatedAt"`;

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

  async findById(id: string): Promise<Lesson | null> {
    const result = await this.db.query<Lesson>(
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

  async approve(id: string, approval: LessonApproval): Promise<Lesson | null> {
    const result = await this.db.query<{ id: string }>(
      `UPDATE lessons
       SET status = 'scheduled', instructor_id = $2, scheduled_date = $3, duration_minutes = $4,
           price = $5, admin_notes = $6, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND status = 'pending'
       RETURNING id`,
      [
        id,
        approval.instructorId,
        approval.scheduledDate,
        approval.durationMinutes,
        approval.price,
        approval.adminNotes ?? null,
      ]
    );
    return result.rows[0] ? this.requireById(id) : null;
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

  async cancel(id: string, cancelledBy: string, reason?: string): Promise<Lesson | null> {
    const result = await this.db.query<{ id: string }>(
      `UPDATE lessons
       SET status = 'cancelled', cancellation_reason = $2, cancelled_by = $3,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND status IN ('pending', 'scheduled')
       RETURNING id`,
      [id, reason ?? null, cancelledBy]
    );
    return result.rows[0] ? this.requireById(id) : null;
  }

  /** Relecture avec les jointures après une écriture (RETURNING ne peut pas joindre). */
  protected async requireById(id: string): Promise<Lesson> {
    const lesson = await this.findById(id);
    if (!lesson) {
      throw new Error(`Leçon ${id} introuvable après écriture`);
    }
    return lesson;
  }
}
