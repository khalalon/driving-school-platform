import { Pool } from 'pg';
import {
  Exam,
  ExamFilters,
  ExamScope,
  NewExamRequest,
  RecordResultDTO,
  ScheduleExamDTO,
} from '../types/exam.types';

export interface IExamRepository {
  createRequest(data: NewExamRequest): Promise<Exam>;
  findById(id: string): Promise<Exam | null>;
  findAll(scope: ExamScope, filters: ExamFilters): Promise<Exam[]>;
  /** X3 : `pending` → `scheduled` ; `null` si l'examen n'est plus `pending`. */
  schedule(id: string, dto: ScheduleExamDTO): Promise<Exam | null>;
  /** X4 : `pending` → `rejected` ; `null` si l'examen n'est plus `pending`. */
  reject(id: string, reason: string): Promise<Exam | null>;
  /** X5 : `scheduled` → `completed` avec résultat ; `null` si l'examen n'est plus `scheduled`. */
  recordResult(id: string, dto: RecordResultDTO): Promise<Exam | null>;
}

/**
 * Schéma 008 : un examen = un élève. `studentId` = users.id (D-28) ; identité de l'élève par
 * `users` (D-16) et leçons effectuées par `student_lesson_stats` (contrat §5, D-26).
 */
const EXAM_COLUMNS = `e.id, e.school_id AS "schoolId", u.id AS "studentId",
  u.first_name AS "studentFirstName", u.last_name AS "studentLastName",
  COALESCE(sls.completed_lessons, 0)::int AS "studentCompletedLessons",
  e.type, e.status, e.preferred_date AS "preferredDate", e.message, e.date_time AS "dateTime",
  e.location, e.result, e.score, e.notes, e.rejection_reason AS "rejectionReason",
  e.price::float8 AS price, e.paid, e.amount::float8 AS amount, e.payment_date AS "paymentDate",
  e.payment_method AS "paymentMethod", e.created_at AS "createdAt", e.updated_at AS "updatedAt"`;

const EXAM_FROM = `FROM exams e
  JOIN students s ON s.id = e.student_id
  JOIN users u ON u.id = s.user_id
  LEFT JOIN student_lesson_stats sls ON sls.student_id = e.student_id AND sls.school_id = e.school_id`;

export class ExamRepository implements IExamRepository {
  constructor(private readonly db: Pool) {}

  /** X2 : demande `pending`, sans date de session ni instructeur (D-33). */
  async createRequest(data: NewExamRequest): Promise<Exam> {
    const inserted = await this.db.query<{ id: string }>(
      `INSERT INTO exams (school_id, student_id, type, status, preferred_date, message,
         created_at, updated_at)
       VALUES ($1, $2, $3, 'pending', $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       RETURNING id`,
      [data.schoolId, data.studentRowId, data.examType, data.preferredDate, data.message ?? null]
    );
    return this.requireById(inserted.rows[0].id);
  }

  async findById(id: string): Promise<Exam | null> {
    const result = await this.db.query<Exam>(
      `SELECT ${EXAM_COLUMNS} ${EXAM_FROM} WHERE e.id = $1`,
      [id]
    );
    return result.rows[0] ?? null;
  }

  /** X1 : les examens de l'élève, ou tous ceux d'une école (pas d'instructeur attitré), ou tout. */
  async findAll(scope: ExamScope, filters: ExamFilters): Promise<Exam[]> {
    const conditions: string[] = [];
    const values: unknown[] = [];
    const param = (value: unknown): string => {
      values.push(value);
      return `$${values.length}`;
    };

    if (scope.kind === 'student') conditions.push(`e.student_id = ${param(scope.studentRowId)}`);
    else if (scope.kind === 'school') conditions.push(`e.school_id = ${param(scope.schoolId)}`);
    if (filters.status && filters.status.length > 0) {
      conditions.push(`e.status = ANY(${param(filters.status)})`);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const result = await this.db.query<Exam>(
      `SELECT ${EXAM_COLUMNS} ${EXAM_FROM} ${where}
       ORDER BY COALESCE(e.date_time, e.preferred_date) ASC, e.created_at ASC`,
      values
    );
    return result.rows;
  }

  async schedule(id: string, dto: ScheduleExamDTO): Promise<Exam | null> {
    const result = await this.db.query<{ id: string }>(
      `UPDATE exams
       SET status = 'scheduled', date_time = $2, location = $3, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND status = 'pending'
       RETURNING id`,
      [id, dto.dateTime, dto.location]
    );
    return result.rows[0] ? this.requireById(id) : null;
  }

  async reject(id: string, reason: string): Promise<Exam | null> {
    const result = await this.db.query<{ id: string }>(
      `UPDATE exams
       SET status = 'rejected', rejection_reason = $2, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND status = 'pending'
       RETURNING id`,
      [id, reason]
    );
    return result.rows[0] ? this.requireById(id) : null;
  }

  async recordResult(id: string, dto: RecordResultDTO): Promise<Exam | null> {
    const result = await this.db.query<{ id: string }>(
      `UPDATE exams
       SET status = 'completed', result = $2, score = $3, notes = $4, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND status = 'scheduled'
       RETURNING id`,
      [id, dto.result, dto.score ?? null, dto.notes ?? null]
    );
    return result.rows[0] ? this.requireById(id) : null;
  }

  /** Relecture avec les jointures après une écriture (RETURNING ne peut pas joindre). */
  protected async requireById(id: string): Promise<Exam> {
    const exam = await this.findById(id);
    if (!exam) {
      throw new Error(`Examen ${id} introuvable après écriture`);
    }
    return exam;
  }
}
