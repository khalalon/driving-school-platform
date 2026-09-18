import { Pool } from 'pg';
import { CreateLessonDTO, Lesson, LessonFilters, UpdateLessonDTO } from '../types/lesson.types';

export interface ILessonRepository {
  create(dto: CreateLessonDTO): Promise<Lesson>;
  findById(id: string): Promise<Lesson | null>;
  findAll(filters: LessonFilters): Promise<Lesson[]>;
  update(id: string, dto: UpdateLessonDTO): Promise<Lesson>;
  delete(id: string): Promise<void>;
  incrementBookings(id: string): Promise<void>;
  decrementBookings(id: string): Promise<void>;
}

/** Schéma 007 : une leçon = un élève, deux dates (demandée / planifiée), paiement sur la leçon. */
const LESSON_COLUMNS = `id, school_id AS "schoolId", student_id AS "studentId",
  instructor_id AS "instructorId", preferred_instructor_id AS "preferredInstructorId", type, status,
  requested_date AS "requestedDate", scheduled_date AS "scheduledDate",
  duration_minutes AS "durationMinutes", price::float8 AS price, capacity,
  current_bookings AS "currentBookings", notes, admin_notes AS "adminNotes",
  rejection_reason AS "rejectionReason", attended, feedback, rating, paid, amount::float8 AS amount,
  payment_date AS "paymentDate", payment_method AS "paymentMethod",
  created_at AS "createdAt", updated_at AS "updatedAt"`;

export class LessonRepository implements ILessonRepository {
  constructor(private readonly db: Pool) {}

  /** Ancienne route de création (jusqu'en 5.2) : leçon directement `scheduled` pour un élève. */
  async create(dto: CreateLessonDTO): Promise<Lesson> {
    const result = await this.db.query<Lesson>(
      `INSERT INTO lessons (school_id, student_id, instructor_id, type, scheduled_date,
         duration_minutes, price, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'scheduled', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       RETURNING ${LESSON_COLUMNS}`,
      [
        dto.schoolId,
        dto.studentId,
        dto.instructorId,
        dto.type,
        dto.scheduledDate,
        dto.durationMinutes,
        dto.price,
      ]
    );
    return result.rows[0];
  }

  async findById(id: string): Promise<Lesson | null> {
    const result = await this.db.query<Lesson>(
      `SELECT ${LESSON_COLUMNS} FROM lessons WHERE id = $1`,
      [id]
    );
    return result.rows[0] ?? null;
  }

  /**
   * Filtres par colonnes. `scope` est résolu par le service (5.2 : il dépend de l'appelant) ;
   * `date` cible le jour de `scheduled_date`, ou de `requested_date` pour une demande `pending`.
   */
  async findAll(filters: LessonFilters): Promise<Lesson[]> {
    const conditions: string[] = [];
    const values: unknown[] = [];
    const add = (column: string, operator: string, value: unknown): void => {
      values.push(value);
      conditions.push(`${column} ${operator} $${values.length}`);
    };

    if (filters.schoolId) add('school_id', '=', filters.schoolId);
    if (filters.instructorId) add('instructor_id', '=', filters.instructorId);
    if (filters.studentId) add('student_id', '=', filters.studentId);
    if (filters.type) add('type', '=', filters.type);
    if (filters.status && filters.status.length > 0) {
      values.push(filters.status);
      conditions.push(`status = ANY($${values.length})`);
    }
    if (filters.date) {
      values.push(filters.date);
      conditions.push(
        `COALESCE(scheduled_date, CASE WHEN status = 'pending' THEN requested_date END)::date = $${values.length}::date`
      );
    }
    if (filters.dateFrom) add('scheduled_date', '>=', filters.dateFrom);
    if (filters.dateTo) add('scheduled_date', '<=', filters.dateTo);

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const result = await this.db.query<Lesson>(
      `SELECT ${LESSON_COLUMNS} FROM lessons ${where}
       ORDER BY COALESCE(scheduled_date, requested_date) ASC, created_at ASC`,
      values
    );
    return result.rows;
  }

  async update(id: string, dto: UpdateLessonDTO): Promise<Lesson> {
    const updates: string[] = [];
    const values: unknown[] = [];
    const set = (column: string, value: unknown): void => {
      values.push(value);
      updates.push(`${column} = $${values.length}`);
    };

    if (dto.instructorId !== undefined) set('instructor_id', dto.instructorId);
    if (dto.scheduledDate !== undefined) set('scheduled_date', dto.scheduledDate);
    if (dto.durationMinutes !== undefined) set('duration_minutes', dto.durationMinutes);
    if (dto.price !== undefined) set('price', dto.price);
    if (dto.status !== undefined) set('status', dto.status);
    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);

    const result = await this.db.query<Lesson>(
      `UPDATE lessons SET ${updates.join(', ')} WHERE id = $${values.length}
       RETURNING ${LESSON_COLUMNS}`,
      values
    );
    return result.rows[0];
  }

  async delete(id: string): Promise<void> {
    await this.db.query('DELETE FROM lessons WHERE id = $1', [id]);
  }

  /** Anciennes réservations (jusqu'en 5.2) ; `capacity = 1` depuis 007, donc jamais au-delà. */
  async incrementBookings(id: string): Promise<void> {
    await this.db.query(
      'UPDATE lessons SET current_bookings = LEAST(current_bookings + 1, capacity) WHERE id = $1',
      [id]
    );
  }

  async decrementBookings(id: string): Promise<void> {
    await this.db.query(
      'UPDATE lessons SET current_bookings = GREATEST(current_bookings - 1, 0) WHERE id = $1',
      [id]
    );
  }
}
