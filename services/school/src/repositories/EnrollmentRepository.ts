/**
 * Enrollment Repository Implementation
 * Single Responsibility: Database access for enrollment requests
 */

import { Pool } from 'pg';
import { IEnrollmentRepository } from './interfaces/IEnrollmentRepository';
import { EnrollmentRequest, CreateEnrollmentRequestDto } from '../services/interfaces/IEnrollmentService';

export class EnrollmentRepository implements IEnrollmentRepository {
  constructor(private db: Pool) {}

  async create(data: CreateEnrollmentRequestDto): Promise<EnrollmentRequest> {
    const query = `
      INSERT INTO enrollment_requests (student_id, school_id, message)
      VALUES ($1, $2, $3)
      RETURNING 
        id,
        student_id as "studentId",
        school_id as "schoolId",
        status,
        message,
        rejection_reason as "rejectionReason",
        processed_by as "processedBy",
        processed_at as "processedAt",
        created_at as "createdAt",
        updated_at as "updatedAt"
    `;

    const result = await this.db.query(query, [
      data.studentId,
      data.schoolId,
      data.message || null,
    ]);

    return result.rows[0];
  }

  async findById(id: string): Promise<EnrollmentRequest | null> {
    const query = `
      SELECT 
        er.id,
        er.student_id as "studentId",
        er.school_id as "schoolId",
        er.status,
        er.message,
        er.rejection_reason as "rejectionReason",
        er.processed_by as "processedBy",
        er.processed_at as "processedAt",
        er.created_at as "createdAt",
        er.updated_at as "updatedAt",
        u.email as "studentEmail",
        s.name as "schoolName"
      FROM enrollment_requests er
      LEFT JOIN users u ON er.student_id = u.id
      LEFT JOIN schools s ON er.school_id = s.id
      WHERE er.id = $1
    `;

    const result = await this.db.query(query, [id]);
    return result.rows[0] || null;
  }

  async findByStudent(studentId: string): Promise<EnrollmentRequest[]> {
    const query = `
      SELECT 
        er.id,
        er.student_id as "studentId",
        er.school_id as "schoolId",
        er.status,
        er.message,
        er.rejection_reason as "rejectionReason",
        er.processed_by as "processedBy",
        er.processed_at as "processedAt",
        er.created_at as "createdAt",
        er.updated_at as "updatedAt",
        s.name as "schoolName",
        s.address as "schoolAddress"
      FROM enrollment_requests er
      LEFT JOIN schools s ON er.school_id = s.id
      WHERE er.student_id = $1
      ORDER BY er.created_at DESC
    `;

    const result = await this.db.query(query, [studentId]);
    return result.rows;
  }

  async findBySchool(schoolId: string, status?: string): Promise<EnrollmentRequest[]> {
    let query = `
      SELECT 
        er.id,
        er.student_id as "studentId",
        er.school_id as "schoolId",
        er.status,
        er.message,
        er.rejection_reason as "rejectionReason",
        er.processed_by as "processedBy",
        er.processed_at as "processedAt",
        er.created_at as "createdAt",
        er.updated_at as "updatedAt",
        u.email as "studentEmail"
      FROM enrollment_requests er
      LEFT JOIN users u ON er.student_id = u.id
      WHERE er.school_id = $1
    `;

    const params: any[] = [schoolId];

    if (status) {
      query += ` AND er.status = $2`;
      params.push(status);
    }

    query += ` ORDER BY er.created_at DESC`;

    const result = await this.db.query(query, params);
    return result.rows;
  }

  async findByStudentAndSchool(
    studentId: string,
    schoolId: string
  ): Promise<EnrollmentRequest | null> {
    const query = `
      SELECT 
        id,
        student_id as "studentId",
        school_id as "schoolId",
        status,
        message,
        rejection_reason as "rejectionReason",
        processed_by as "processedBy",
        processed_at as "processedAt",
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM enrollment_requests
      WHERE student_id = $1 AND school_id = $2
      ORDER BY created_at DESC
      LIMIT 1
    `;

    const result = await this.db.query(query, [studentId, schoolId]);
    return result.rows[0] || null;
  }

  async updateStatus(
    requestId: string,
    status: 'approved' | 'rejected',
    processedBy: string,
    reason?: string
  ): Promise<EnrollmentRequest> {
    const query = `
      UPDATE enrollment_requests
      SET 
        status = $1,
        processed_by = $2,
        processed_at = CURRENT_TIMESTAMP,
        rejection_reason = $3,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $4
      RETURNING 
        id,
        student_id as "studentId",
        school_id as "schoolId",
        status,
        message,
        rejection_reason as "rejectionReason",
        processed_by as "processedBy",
        processed_at as "processedAt",
        created_at as "createdAt",
        updated_at as "updatedAt"
    `;

    const result = await this.db.query(query, [status, processedBy, reason || null, requestId]);
    return result.rows[0];
  }
}
