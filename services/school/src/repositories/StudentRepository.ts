/**
 * Student Repository Implementation
 * Single Responsibility: Student database access
 */

import { Pool } from 'pg';
import { IStudentRepository, Student, CreateStudentDto } from './interfaces/IStudentRepository';

export class StudentRepository implements IStudentRepository {
  constructor(private db: Pool) {}

  async create(data: CreateStudentDto): Promise<Student> {
    const query = `
      INSERT INTO students (user_id, school_id, authorized, enrollment_request_id, enrollment_date)
      VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
      RETURNING 
        id,
        user_id as "userId",
        school_id as "schoolId",
        authorized,
        enrollment_request_id as "enrollmentRequestId",
        enrollment_date as "enrollmentDate",
        created_at as "createdAt",
        updated_at as "updatedAt"
    `;

    const result = await this.db.query(query, [
      data.userId,
      data.schoolId,
      data.authorized,
      data.enrollmentRequestId || null,
    ]);

    return result.rows[0];
  }

  async findByUserAndSchool(userId: string, schoolId: string): Promise<Student | null> {
    const query = `
      SELECT 
        id,
        user_id as "userId",
        school_id as "schoolId",
        authorized,
        enrollment_request_id as "enrollmentRequestId",
        enrollment_date as "enrollmentDate",
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM students
      WHERE user_id = $1 AND school_id = $2
    `;

    const result = await this.db.query(query, [userId, schoolId]);
    return result.rows[0] || null;
  }

  async findBySchool(schoolId: string): Promise<Student[]> {
    const query = `
      SELECT 
        s.id,
        s.user_id as "userId",
        s.school_id as "schoolId",
        s.authorized,
        s.enrollment_date as "enrollmentDate",
        s.created_at as "createdAt",
        s.updated_at as "updatedAt",
        u.email as "email"
      FROM students s
      LEFT JOIN users u ON s.user_id = u.id
      WHERE s.school_id = $1
      ORDER BY s.created_at DESC
    `;

    const result = await this.db.query(query, [schoolId]);
    return result.rows;
  }
}
