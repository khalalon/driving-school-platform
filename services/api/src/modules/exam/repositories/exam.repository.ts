import { Pool } from 'pg';
import { CreateExamDTO, Exam, ExamFilters, UpdateExamDTO } from '../types/exam.types';

export interface IExamRepository {
  create(dto: CreateExamDTO): Promise<Exam>;
  findById(id: string): Promise<Exam | null>;
  findAll(filters: ExamFilters): Promise<Exam[]>;
  update(id: string, dto: UpdateExamDTO): Promise<Exam>;
  delete(id: string): Promise<void>;
}

/**
 * Schéma 008 : un examen = un élève. L'identité de l'élève vient de `users` (D-16) et son
 * nombre de leçons effectuées de `student_lesson_stats` (contrat §5, D-26).
 */
const EXAM_COLUMNS = `e.id, e.school_id AS "schoolId", e.student_id AS "studentId",
  COALESCE(u.first_name, '') AS "studentFirstName", COALESCE(u.last_name, '') AS "studentLastName",
  COALESCE(sls.completed_lessons, 0)::int AS "studentCompletedLessons",
  e.type, e.status, e.preferred_date AS "preferredDate", e.message, e.date_time AS "dateTime",
  e.location, e.result, e.score, e.notes, e.rejection_reason AS "rejectionReason",
  e.price::float8 AS price, e.paid, e.amount::float8 AS amount, e.payment_date AS "paymentDate",
  e.payment_method AS "paymentMethod", e.examiner_id AS "examinerId",
  e.created_at AS "createdAt", e.updated_at AS "updatedAt"`;

const EXAM_FROM = `FROM exams e
  JOIN students s ON s.id = e.student_id
  LEFT JOIN users u ON u.id = s.user_id
  LEFT JOIN student_lesson_stats sls ON sls.student_id = e.student_id AND sls.school_id = e.school_id`;

export class ExamRepository implements IExamRepository {
  constructor(private readonly db: Pool) {}

  /** Ancienne route de création (jusqu'en 5.5) : examen directement `scheduled` pour un élève. */
  async create(dto: CreateExamDTO): Promise<Exam> {
    const inserted = await this.db.query<{ id: string }>(
      `INSERT INTO exams (school_id, student_id, type, date_time, location, examiner_id, price,
         status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'scheduled', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       RETURNING id`,
      [
        dto.schoolId,
        dto.studentId,
        dto.type,
        dto.dateTime,
        dto.location ?? null,
        dto.examinerId ?? null,
        dto.price,
      ]
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

  async findAll(filters: ExamFilters): Promise<Exam[]> {
    const conditions: string[] = [];
    const values: unknown[] = [];
    const add = (column: string, operator: string, value: unknown): void => {
      values.push(value);
      conditions.push(`${column} ${operator} $${values.length}`);
    };

    if (filters.schoolId) add('e.school_id', '=', filters.schoolId);
    if (filters.studentId) add('e.student_id', '=', filters.studentId);
    if (filters.type) add('e.type', '=', filters.type);
    if (filters.status && filters.status.length > 0) {
      values.push(filters.status);
      conditions.push(`e.status = ANY($${values.length})`);
    }
    if (filters.dateFrom) add('e.date_time', '>=', filters.dateFrom);
    if (filters.dateTo) add('e.date_time', '<=', filters.dateTo);

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const result = await this.db.query<Exam>(
      `SELECT ${EXAM_COLUMNS} ${EXAM_FROM} ${where}
       ORDER BY COALESCE(e.date_time, e.preferred_date) ASC, e.created_at ASC`,
      values
    );
    return result.rows;
  }

  async update(id: string, dto: UpdateExamDTO): Promise<Exam> {
    const updates: string[] = [];
    const values: unknown[] = [];
    const set = (column: string, value: unknown): void => {
      values.push(value);
      updates.push(`${column} = $${values.length}`);
    };

    if (dto.dateTime !== undefined) set('date_time', dto.dateTime);
    if (dto.location !== undefined) set('location', dto.location);
    if (dto.examinerId !== undefined) set('examiner_id', dto.examinerId);
    if (dto.price !== undefined) set('price', dto.price);
    if (dto.status !== undefined) set('status', dto.status);
    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);

    await this.db.query(
      `UPDATE exams SET ${updates.join(', ')} WHERE id = $${values.length}`,
      values
    );
    return this.requireById(id);
  }

  async delete(id: string): Promise<void> {
    await this.db.query('DELETE FROM exams WHERE id = $1', [id]);
  }

  /** Relecture avec les jointures après une écriture (RETURNING ne peut pas joindre). */
  private async requireById(id: string): Promise<Exam> {
    const exam = await this.findById(id);
    if (!exam) {
      throw new Error(`Examen ${id} introuvable après écriture`);
    }
    return exam;
  }
}
