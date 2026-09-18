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

const LESSON_COLUMNS = `id, school_id AS "schoolId", instructor_id AS "instructorId", type,
  date_time AS "dateTime", duration_minutes AS "durationMinutes", capacity,
  current_bookings AS "currentBookings", price::float8 AS price, status,
  created_at AS "createdAt", updated_at AS "updatedAt"`;

export class LessonRepository implements ILessonRepository {
  constructor(private readonly db: Pool) {}

  async create(dto: CreateLessonDTO): Promise<Lesson> {
    const result = await this.db.query<Lesson>(
      `INSERT INTO lessons (school_id, instructor_id, type, date_time, duration_minutes, capacity,
         current_bookings, price, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, 0, $7, 'scheduled', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       RETURNING ${LESSON_COLUMNS}`,
      [
        dto.schoolId,
        dto.instructorId,
        dto.type,
        dto.dateTime,
        dto.durationMinutes,
        dto.capacity,
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

  /** Le filtre `studentId` est accepté par le validateur mais ignoré ici (état actuel). */
  async findAll(filters: LessonFilters): Promise<Lesson[]> {
    const conditions: string[] = [];
    const values: unknown[] = [];
    const add = (column: string, operator: string, value: unknown): void => {
      values.push(value);
      conditions.push(`${column} ${operator} $${values.length}`);
    };

    if (filters.schoolId) add('school_id', '=', filters.schoolId);
    if (filters.instructorId) add('instructor_id', '=', filters.instructorId);
    if (filters.type) add('type', '=', filters.type);
    if (filters.status) add('status', '=', filters.status);
    if (filters.dateFrom) add('date_time', '>=', filters.dateFrom);
    if (filters.dateTo) add('date_time', '<=', filters.dateTo);

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const result = await this.db.query<Lesson>(
      `SELECT ${LESSON_COLUMNS} FROM lessons ${where} ORDER BY date_time ASC`,
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
    if (dto.dateTime !== undefined) set('date_time', dto.dateTime);
    if (dto.durationMinutes !== undefined) set('duration_minutes', dto.durationMinutes);
    if (dto.capacity !== undefined) set('capacity', dto.capacity);
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

  async incrementBookings(id: string): Promise<void> {
    await this.db.query(
      'UPDATE lessons SET current_bookings = current_bookings + 1 WHERE id = $1',
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
