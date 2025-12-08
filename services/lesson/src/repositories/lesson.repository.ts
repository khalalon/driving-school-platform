import { Pool } from 'pg';
import { Lesson, CreateLessonDTO, UpdateLessonDTO, LessonFilters } from '../types';

export interface ILessonRepository {
  create(dto: CreateLessonDTO): Promise<Lesson>;
  findById(id: string): Promise<Lesson | null>;
  findAll(filters: LessonFilters): Promise<Lesson[]>;
  update(id: string, dto: UpdateLessonDTO): Promise<Lesson>;
  delete(id: string): Promise<void>;
  incrementBookings(id: string): Promise<void>;
  decrementBookings(id: string): Promise<void>;
}

export class LessonRepository implements ILessonRepository {
  constructor(private readonly db: Pool) {}

  async create(dto: CreateLessonDTO): Promise<Lesson> {
    const query = `
      INSERT INTO lessons (
        school_id, instructor_id, type, date_time, duration_minutes,
        capacity, current_bookings, price, status, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, 0, $7, 'scheduled', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING 
        id,
        school_id as "schoolId",
        instructor_id as "instructorId",
        type,
        date_time as "dateTime",
        duration_minutes as "durationMinutes",
        capacity,
        current_bookings as "currentBookings",
        price,
        status,
        created_at as "createdAt",
        updated_at as "updatedAt"
    `;

    const result = await this.db.query(query, [
      dto.schoolId,
      dto.instructorId,
      dto.type,
      dto.dateTime,
      dto.durationMinutes,
      dto.capacity,
      dto.price,
    ]);

    return result.rows[0] as Lesson;
  }

  async findById(id: string): Promise<Lesson | null> {
    const query = `
      SELECT 
        id,
        school_id as "schoolId",
        instructor_id as "instructorId",
        type,
        date_time as "dateTime",
        duration_minutes as "durationMinutes",
        capacity,
        current_bookings as "currentBookings",
        price,
        status,
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM lessons
      WHERE id = $1
    `;

    const result = await this.db.query(query, [id]);
    return result.rows[0] || null;
  }

  async findAll(filters: LessonFilters): Promise<Lesson[]> {
    const conditions: string[] = [];
    const values: unknown[] = [];
    let paramCount = 1;

    if (filters.schoolId) {
      conditions.push(`school_id = $${paramCount++}`);
      values.push(filters.schoolId);
    }
    if (filters.instructorId) {
      conditions.push(`instructor_id = $${paramCount++}`);
      values.push(filters.instructorId);
    }
    if (filters.type) {
      conditions.push(`type = $${paramCount++}`);
      values.push(filters.type);
    }
    if (filters.status) {
      conditions.push(`status = $${paramCount++}`);
      values.push(filters.status);
    }
    if (filters.dateFrom) {
      conditions.push(`date_time >= $${paramCount++}`);
      values.push(filters.dateFrom);
    }
    if (filters.dateTo) {
      conditions.push(`date_time <= $${paramCount++}`);
      values.push(filters.dateTo);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const query = `
      SELECT 
        id,
        school_id as "schoolId",
        instructor_id as "instructorId",
        type,
        date_time as "dateTime",
        duration_minutes as "durationMinutes",
        capacity,
        current_bookings as "currentBookings",
        price,
        status,
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM lessons
      ${whereClause}
      ORDER BY date_time ASC
    `;

    const result = await this.db.query(query, values);
    return result.rows as Lesson[];
  }

  async update(id: string, dto: UpdateLessonDTO): Promise<Lesson> {
    const updates: string[] = [];
    const values: unknown[] = [];
    let paramCount = 1;

    if (dto.instructorId !== undefined) {
      updates.push(`instructor_id = $${paramCount++}`);
      values.push(dto.instructorId);
    }
    if (dto.dateTime !== undefined) {
      updates.push(`date_time = $${paramCount++}`);
      values.push(dto.dateTime);
    }
    if (dto.durationMinutes !== undefined) {
      updates.push(`duration_minutes = $${paramCount++}`);
      values.push(dto.durationMinutes);
    }
    if (dto.capacity !== undefined) {
      updates.push(`capacity = $${paramCount++}`);
      values.push(dto.capacity);
    }
    if (dto.price !== undefined) {
      updates.push(`price = $${paramCount++}`);
      values.push(dto.price);
    }
    if (dto.status !== undefined) {
      updates.push(`status = $${paramCount++}`);
      values.push(dto.status);
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const query = `
      UPDATE lessons
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING 
        id,
        school_id as "schoolId",
        instructor_id as "instructorId",
        type,
        date_time as "dateTime",
        duration_minutes as "durationMinutes",
        capacity,
        current_bookings as "currentBookings",
        price,
        status,
        created_at as "createdAt",
        updated_at as "updatedAt"
    `;

    const result = await this.db.query(query, values);
    return result.rows[0] as Lesson;
  }

  async delete(id: string): Promise<void> {
    const query = 'DELETE FROM lessons WHERE id = $1';
    await this.db.query(query, [id]);
  }

  async incrementBookings(id: string): Promise<void> {
    const query = `
      UPDATE lessons
      SET current_bookings = current_bookings + 1
      WHERE id = $1
    `;
    await this.db.query(query, [id]);
  }

  async decrementBookings(id: string): Promise<void> {
    const query = `
      UPDATE lessons
      SET current_bookings = GREATEST(current_bookings - 1, 0)
      WHERE id = $1
    `;
    await this.db.query(query, [id]);
  }
}
