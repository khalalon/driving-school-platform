import { Pool } from 'pg';
import { CreateStudentDTO, Student } from '../types/student.types';

export interface IStudentRepository {
  create(data: CreateStudentDTO): Promise<Student>;
  findById(id: string): Promise<Student | null>;
  findByUserId(userId: string): Promise<Student | null>;
  findByUserAndSchool(userId: string, schoolId: string): Promise<Student | null>;
  findBySchool(schoolId: string): Promise<Student[]>;
}

const STUDENT_COLUMNS = (alias = ''): string => {
  const p = alias ? `${alias}.` : '';
  return `${p}id, ${p}user_id AS "userId", ${p}school_id AS "schoolId", ${p}authorized,
    ${p}enrollment_request_id AS "enrollmentRequestId", ${p}enrollment_date AS "enrollmentDate",
    ${p}created_at AS "createdAt", ${p}updated_at AS "updatedAt"`;
};

export class StudentRepository implements IStudentRepository {
  constructor(private readonly db: Pool) {}

  /**
   * État actuel : `students.name` est NOT NULL et n'est pas renseigné ici → l'INSERT échoue
   * (ARCHITECTURE §4, corrigé en 3.1 / 3.2). Porté tel quel.
   */
  async create(data: CreateStudentDTO): Promise<Student> {
    const result = await this.db.query<Student>(
      `INSERT INTO students (user_id, school_id, authorized, enrollment_request_id, enrollment_date)
       VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
       RETURNING ${STUDENT_COLUMNS()}`,
      [data.userId, data.schoolId, data.authorized, data.enrollmentRequestId ?? null]
    );
    return result.rows[0];
  }

  async findById(id: string): Promise<Student | null> {
    const result = await this.db.query<Student>(
      `SELECT ${STUDENT_COLUMNS()} FROM students WHERE id = $1`,
      [id]
    );
    return result.rows[0] ?? null;
  }

  async findByUserId(userId: string): Promise<Student | null> {
    const result = await this.db.query<Student>(
      `SELECT ${STUDENT_COLUMNS()} FROM students WHERE user_id = $1`,
      [userId]
    );
    return result.rows[0] ?? null;
  }

  async findByUserAndSchool(userId: string, schoolId: string): Promise<Student | null> {
    const result = await this.db.query<Student>(
      `SELECT ${STUDENT_COLUMNS()} FROM students WHERE user_id = $1 AND school_id = $2`,
      [userId, schoolId]
    );
    return result.rows[0] ?? null;
  }

  async findBySchool(schoolId: string): Promise<Student[]> {
    const result = await this.db.query<Student>(
      `SELECT ${STUDENT_COLUMNS('s')}, u.email
       FROM students s
       LEFT JOIN users u ON s.user_id = u.id
       WHERE s.school_id = $1
       ORDER BY s.created_at DESC`,
      [schoolId]
    );
    return result.rows;
  }
}
