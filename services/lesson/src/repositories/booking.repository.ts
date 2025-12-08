import { Pool } from 'pg';
import { LessonBooking, MarkAttendanceDTO } from '../types';

export interface IBookingRepository {
  create(lessonId: string, studentId: string): Promise<LessonBooking>;
  findById(id: string): Promise<LessonBooking | null>;
  findByLessonId(lessonId: string): Promise<LessonBooking[]>;
  findByStudentId(studentId: string): Promise<LessonBooking[]>;
  findByLessonAndStudent(lessonId: string, studentId: string): Promise<LessonBooking | null>;
  updateAttendance(id: string, dto: MarkAttendanceDTO): Promise<LessonBooking>;
  delete(id: string): Promise<void>;
}

export class BookingRepository implements IBookingRepository {
  constructor(private readonly db: Pool) {}

  async create(lessonId: string, studentId: string): Promise<LessonBooking> {
    const query = `
      INSERT INTO lesson_bookings (lesson_id, student_id, created_at)
      VALUES ($1, $2, CURRENT_TIMESTAMP)
      RETURNING 
        id,
        lesson_id as "lessonId",
        student_id as "studentId",
        attended,
        feedback,
        rating,
        created_at as "createdAt"
    `;

    const result = await this.db.query(query, [lessonId, studentId]);
    return result.rows[0] as LessonBooking;
  }

  async findById(id: string): Promise<LessonBooking | null> {
    const query = `
      SELECT 
        id,
        lesson_id as "lessonId",
        student_id as "studentId",
        attended,
        feedback,
        rating,
        created_at as "createdAt"
      FROM lesson_bookings
      WHERE id = $1
    `;

    const result = await this.db.query(query, [id]);
    return result.rows[0] || null;
  }

  async findByLessonId(lessonId: string): Promise<LessonBooking[]> {
    const query = `
      SELECT 
        id,
        lesson_id as "lessonId",
        student_id as "studentId",
        attended,
        feedback,
        rating,
        created_at as "createdAt"
      FROM lesson_bookings
      WHERE lesson_id = $1
      ORDER BY created_at DESC
    `;

    const result = await this.db.query(query, [lessonId]);
    return result.rows as LessonBooking[];
  }

  async findByStudentId(studentId: string): Promise<LessonBooking[]> {
    const query = `
      SELECT 
        id,
        lesson_id as "lessonId",
        student_id as "studentId",
        attended,
        feedback,
        rating,
        created_at as "createdAt"
      FROM lesson_bookings
      WHERE student_id = $1
      ORDER BY created_at DESC
    `;

    const result = await this.db.query(query, [studentId]);
    return result.rows as LessonBooking[];
  }

  async findByLessonAndStudent(lessonId: string, studentId: string): Promise<LessonBooking | null> {
    const query = `
      SELECT 
        id,
        lesson_id as "lessonId",
        student_id as "studentId",
        attended,
        feedback,
        rating,
        created_at as "createdAt"
      FROM lesson_bookings
      WHERE lesson_id = $1 AND student_id = $2
    `;

    const result = await this.db.query(query, [lessonId, studentId]);
    return result.rows[0] || null;
  }

  async updateAttendance(id: string, dto: MarkAttendanceDTO): Promise<LessonBooking> {
    const updates: string[] = [`attended = $1`];
    const values: unknown[] = [dto.attended];
    let paramCount = 2;

    if (dto.feedback !== undefined) {
      updates.push(`feedback = $${paramCount++}`);
      values.push(dto.feedback);
    }
    if (dto.rating !== undefined) {
      updates.push(`rating = $${paramCount++}`);
      values.push(dto.rating);
    }

    values.push(id);

    const query = `
      UPDATE lesson_bookings
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING 
        id,
        lesson_id as "lessonId",
        student_id as "studentId",
        attended,
        feedback,
        rating,
        created_at as "createdAt"
    `;

    const result = await this.db.query(query, values);
    return result.rows[0] as LessonBooking;
  }

  async delete(id: string): Promise<void> {
    const query = 'DELETE FROM lesson_bookings WHERE id = $1';
    await this.db.query(query, [id]);
  }
}
