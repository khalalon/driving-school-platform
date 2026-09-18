import { Pool } from 'pg';
import { ExamRegistration, ExamResult, RecordResultDTO } from '../types/exam.types';

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

const REGISTRATION_COLUMNS = `id, exam_id AS "examId", student_id AS "studentId", result, score, notes,
  created_at AS "createdAt", updated_at AS "updatedAt"`;

export class RegistrationRepository implements IRegistrationRepository {
  constructor(private readonly db: Pool) {}

  async create(examId: string, studentId: string): Promise<ExamRegistration> {
    const result = await this.db.query<ExamRegistration>(
      `INSERT INTO exam_registrations (exam_id, student_id, result, created_at, updated_at)
       VALUES ($1, $2, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       RETURNING ${REGISTRATION_COLUMNS}`,
      [examId, studentId, ExamResult.PENDING]
    );
    return result.rows[0];
  }

  async findById(id: string): Promise<ExamRegistration | null> {
    const result = await this.db.query<ExamRegistration>(
      `SELECT ${REGISTRATION_COLUMNS} FROM exam_registrations WHERE id = $1`,
      [id]
    );
    return result.rows[0] ?? null;
  }

  async findByExamId(examId: string): Promise<ExamRegistration[]> {
    const result = await this.db.query<ExamRegistration>(
      `SELECT ${REGISTRATION_COLUMNS} FROM exam_registrations WHERE exam_id = $1 ORDER BY created_at DESC`,
      [examId]
    );
    return result.rows;
  }

  async findByStudentId(studentId: string): Promise<ExamRegistration[]> {
    const result = await this.db.query<ExamRegistration>(
      `SELECT ${REGISTRATION_COLUMNS} FROM exam_registrations WHERE student_id = $1 ORDER BY created_at DESC`,
      [studentId]
    );
    return result.rows;
  }

  async findByExamAndStudent(examId: string, studentId: string): Promise<ExamRegistration | null> {
    const result = await this.db.query<ExamRegistration>(
      `SELECT ${REGISTRATION_COLUMNS} FROM exam_registrations WHERE exam_id = $1 AND student_id = $2`,
      [examId, studentId]
    );
    return result.rows[0] ?? null;
  }

  async updateResult(id: string, dto: RecordResultDTO): Promise<ExamRegistration> {
    const updates = ['result = $1'];
    const values: unknown[] = [dto.result];
    if (dto.score !== undefined) {
      values.push(dto.score);
      updates.push(`score = $${values.length}`);
    }
    if (dto.notes !== undefined) {
      values.push(dto.notes);
      updates.push(`notes = $${values.length}`);
    }
    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);

    const result = await this.db.query<ExamRegistration>(
      `UPDATE exam_registrations SET ${updates.join(', ')} WHERE id = $${values.length}
       RETURNING ${REGISTRATION_COLUMNS}`,
      values
    );
    return result.rows[0];
  }

  async delete(id: string): Promise<void> {
    await this.db.query('DELETE FROM exam_registrations WHERE id = $1', [id]);
  }

  /** Leçons pointées présentes pour un students.id (règle d'éligibilité, supprimée en 5.7 — D-26). */
  async countCompletedLessons(studentId: string): Promise<number> {
    const result = await this.db.query<{ count: string }>(
      'SELECT COUNT(*) AS count FROM lesson_bookings WHERE student_id = $1 AND attended = true',
      [studentId]
    );
    return Number(result.rows[0].count);
  }
}
