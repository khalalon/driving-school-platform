import { Pool } from 'pg';
import { ExamRegistration, RecordResultDTO, ExamResult } from '../types';

export interface IRegistrationRepository {
  create(examId: string, studentId: string): Promise<ExamRegistration>;
  findById(id: string): Promise<ExamRegistration | null>;
  findByExamId(examId: string): Promise<ExamRegistration[]>;
  findByStudentId(studentId: string): Promise<ExamRegistration[]>;
  findByExamAndStudent(examId: string, studentId: string): Promise<ExamRegistration | null>;
  updateResult(id: string, dto: RecordResultDTO): Promise<ExamRegistration>;
  delete(id: string): Promise<void>;
  countCompletedLessons(studentId: string): Promise<number>;
}

export class RegistrationRepository implements IRegistrationRepository {
  constructor(private readonly db: Pool) {}

  async create(examId: string, studentId: string): Promise<ExamRegistration> {
    const query = `
      INSERT INTO exam_registrations (
        exam_id, student_id, result, created_at, updated_at
      )
      VALUES ($1, $2, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING 
        id,
        exam_id as "examId",
        student_id as "studentId",
        result,
        score,
        notes,
        created_at as "createdAt",
        updated_at as "updatedAt"
    `;

    const result = await this.db.query(query, [examId, studentId, ExamResult.PENDING]);
    return result.rows[0] as ExamRegistration;
  }

  async findById(id: string): Promise<ExamRegistration | null> {
    const query = `
      SELECT 
        id,
        exam_id as "examId",
        student_id as "studentId",
        result,
        score,
        notes,
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM exam_registrations
      WHERE id = $1
    `;

    const result = await this.db.query(query, [id]);
    return result.rows[0] || null;
  }

  async findByExamId(examId: string): Promise<ExamRegistration[]> {
    const query = `
      SELECT 
        id,
        exam_id as "examId",
        student_id as "studentId",
        result,
        score,
        notes,
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM exam_registrations
      WHERE exam_id = $1
      ORDER BY created_at DESC
    `;

    const result = await this.db.query(query, [examId]);
    return result.rows as ExamRegistration[];
  }

  async findByStudentId(studentId: string): Promise<ExamRegistration[]> {
    const query = `
      SELECT 
        id,
        exam_id as "examId",
        student_id as "studentId",
        result,
        score,
        notes,
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM exam_registrations
      WHERE student_id = $1
      ORDER BY created_at DESC
    `;

    const result = await this.db.query(query, [studentId]);
    return result.rows as ExamRegistration[];
  }

  async findByExamAndStudent(examId: string, studentId: string): Promise<ExamRegistration | null> {
    const query = `
      SELECT 
        id,
        exam_id as "examId",
        student_id as "studentId",
        result,
        score,
        notes,
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM exam_registrations
      WHERE exam_id = $1 AND student_id = $2
    `;

    const result = await this.db.query(query, [examId, studentId]);
    return result.rows[0] || null;
  }

  async updateResult(id: string, dto: RecordResultDTO): Promise<ExamRegistration> {
    const updates: string[] = [`result = $1`];
    const values: unknown[] = [dto.result];
    let paramCount = 2;

    if (dto.score !== undefined) {
      updates.push(`score = $${paramCount++}`);
      values.push(dto.score);
    }
    if (dto.notes !== undefined) {
      updates.push(`notes = $${paramCount++}`);
      values.push(dto.notes);
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const query = `
      UPDATE exam_registrations
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING 
        id,
        exam_id as "examId",
        student_id as "studentId",
        result,
        score,
        notes,
        created_at as "createdAt",
        updated_at as "updatedAt"
    `;

    const result = await this.db.query(query, values);
    return result.rows[0] as ExamRegistration;
  }

  async delete(id: string): Promise<void> {
    const query = 'DELETE FROM exam_registrations WHERE id = $1';
    await this.db.query(query, [id]);
  }

  async countCompletedLessons(studentId: string): Promise<number> {
    const query = `
      SELECT COUNT(*) as count
      FROM lesson_bookings
      WHERE student_id = $1 AND attended = true
    `;

    const result = await this.db.query(query, [studentId]);
    return parseInt(result.rows[0].count, 10);
  }
}
