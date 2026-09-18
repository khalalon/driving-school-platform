import { Pool } from 'pg';
import { LessonBooking, MarkAttendanceDTO } from '../types/lesson.types';

export interface IBookingRepository {
  create(lessonId: string, studentId: string): Promise<LessonBooking>;
  findById(id: string): Promise<LessonBooking | null>;
  findByLessonId(lessonId: string): Promise<LessonBooking[]>;
  findByStudentId(studentId: string): Promise<LessonBooking[]>;
  findByLessonAndStudent(lessonId: string, studentId: string): Promise<LessonBooking | null>;
  updateAttendance(id: string, dto: MarkAttendanceDTO): Promise<LessonBooking>;
  delete(id: string): Promise<void>;
}

const BOOKING_COLUMNS = `id, lesson_id AS "lessonId", student_id AS "studentId", attended, feedback,
  rating, created_at AS "createdAt"`;

export class BookingRepository implements IBookingRepository {
  constructor(private readonly db: Pool) {}

  async create(lessonId: string, studentId: string): Promise<LessonBooking> {
    const result = await this.db.query<LessonBooking>(
      `INSERT INTO lesson_bookings (lesson_id, student_id, created_at)
       VALUES ($1, $2, CURRENT_TIMESTAMP)
       RETURNING ${BOOKING_COLUMNS}`,
      [lessonId, studentId]
    );
    return result.rows[0];
  }

  async findById(id: string): Promise<LessonBooking | null> {
    const result = await this.db.query<LessonBooking>(
      `SELECT ${BOOKING_COLUMNS} FROM lesson_bookings WHERE id = $1`,
      [id]
    );
    return result.rows[0] ?? null;
  }

  async findByLessonId(lessonId: string): Promise<LessonBooking[]> {
    const result = await this.db.query<LessonBooking>(
      `SELECT ${BOOKING_COLUMNS} FROM lesson_bookings WHERE lesson_id = $1 ORDER BY created_at DESC`,
      [lessonId]
    );
    return result.rows;
  }

  async findByStudentId(studentId: string): Promise<LessonBooking[]> {
    const result = await this.db.query<LessonBooking>(
      `SELECT ${BOOKING_COLUMNS} FROM lesson_bookings WHERE student_id = $1 ORDER BY created_at DESC`,
      [studentId]
    );
    return result.rows;
  }

  async findByLessonAndStudent(lessonId: string, studentId: string): Promise<LessonBooking | null> {
    const result = await this.db.query<LessonBooking>(
      `SELECT ${BOOKING_COLUMNS} FROM lesson_bookings WHERE lesson_id = $1 AND student_id = $2`,
      [lessonId, studentId]
    );
    return result.rows[0] ?? null;
  }

  async updateAttendance(id: string, dto: MarkAttendanceDTO): Promise<LessonBooking> {
    const updates = ['attended = $1'];
    const values: unknown[] = [dto.attended];
    if (dto.feedback !== undefined) {
      values.push(dto.feedback);
      updates.push(`feedback = $${values.length}`);
    }
    if (dto.rating !== undefined) {
      values.push(dto.rating);
      updates.push(`rating = $${values.length}`);
    }
    values.push(id);

    const result = await this.db.query<LessonBooking>(
      `UPDATE lesson_bookings SET ${updates.join(', ')} WHERE id = $${values.length}
       RETURNING ${BOOKING_COLUMNS}`,
      values
    );
    return result.rows[0];
  }

  async delete(id: string): Promise<void> {
    await this.db.query('DELETE FROM lesson_bookings WHERE id = $1', [id]);
  }
}
