import { Pool } from 'pg';
import { EnrollmentRequestStatus } from '../../../types/domain';
import { EnrollmentRequest } from '../types/student.types';

export interface IEnrollmentRepository {
  create(studentId: string, schoolId: string, message?: string): Promise<EnrollmentRequest>;
  findById(id: string): Promise<EnrollmentRequest | null>;
  findByStudent(studentId: string): Promise<EnrollmentRequest[]>;
  findBySchool(schoolId: string, status?: EnrollmentRequestStatus): Promise<EnrollmentRequest[]>;
  findByStudentAndSchool(studentId: string, schoolId: string): Promise<EnrollmentRequest | null>;
  updateStatus(
    requestId: string,
    status: 'approved' | 'rejected',
    processedBy: string,
    reason?: string
  ): Promise<EnrollmentRequest>;
}

// Identité de l'élève : users.first_name / users.last_name depuis 3.1 (D-16).
const STUDENT_IDENTITY = `u.email AS "studentEmail", u.first_name AS "studentFirstName",
    u.last_name AS "studentLastName"`;

const REQUEST_COLUMNS = (alias = ''): string => {
  const p = alias ? `${alias}.` : '';
  return `${p}id, ${p}student_id AS "studentId", ${p}school_id AS "schoolId", ${p}status, ${p}message,
    ${p}rejection_reason AS "rejectionReason", ${p}processed_by AS "processedBy",
    ${p}processed_at AS "processedAt", ${p}created_at AS "createdAt", ${p}updated_at AS "updatedAt"`;
};

export class EnrollmentRepository implements IEnrollmentRepository {
  constructor(private readonly db: Pool) {}

  async create(studentId: string, schoolId: string, message?: string): Promise<EnrollmentRequest> {
    const result = await this.db.query<EnrollmentRequest>(
      `INSERT INTO enrollment_requests (student_id, school_id, message)
       VALUES ($1, $2, $3)
       RETURNING ${REQUEST_COLUMNS()}`,
      [studentId, schoolId, message ?? null]
    );
    return result.rows[0];
  }

  async findById(id: string): Promise<EnrollmentRequest | null> {
    const result = await this.db.query<EnrollmentRequest>(
      `SELECT ${REQUEST_COLUMNS('er')}, ${STUDENT_IDENTITY}, s.name AS "schoolName"
       FROM enrollment_requests er
       LEFT JOIN users u ON er.student_id = u.id
       LEFT JOIN schools s ON er.school_id = s.id
       WHERE er.id = $1`,
      [id]
    );
    return result.rows[0] ?? null;
  }

  async findByStudent(studentId: string): Promise<EnrollmentRequest[]> {
    const result = await this.db.query<EnrollmentRequest>(
      `SELECT ${REQUEST_COLUMNS('er')}, s.name AS "schoolName", s.address AS "schoolAddress"
       FROM enrollment_requests er
       LEFT JOIN schools s ON er.school_id = s.id
       WHERE er.student_id = $1
       ORDER BY er.created_at DESC`,
      [studentId]
    );
    return result.rows;
  }

  async findBySchool(
    schoolId: string,
    status?: EnrollmentRequestStatus
  ): Promise<EnrollmentRequest[]> {
    const params: string[] = [schoolId];
    let where = 'WHERE er.school_id = $1';
    if (status) {
      params.push(status);
      where += ' AND er.status = $2';
    }
    const result = await this.db.query<EnrollmentRequest>(
      `SELECT ${REQUEST_COLUMNS('er')}, ${STUDENT_IDENTITY}
       FROM enrollment_requests er
       LEFT JOIN users u ON er.student_id = u.id
       ${where}
       ORDER BY er.created_at DESC`,
      params
    );
    return result.rows;
  }

  async findByStudentAndSchool(
    studentId: string,
    schoolId: string
  ): Promise<EnrollmentRequest | null> {
    const result = await this.db.query<EnrollmentRequest>(
      `SELECT ${REQUEST_COLUMNS()}
       FROM enrollment_requests
       WHERE student_id = $1 AND school_id = $2
       ORDER BY created_at DESC
       LIMIT 1`,
      [studentId, schoolId]
    );
    return result.rows[0] ?? null;
  }

  async updateStatus(
    requestId: string,
    status: 'approved' | 'rejected',
    processedBy: string,
    reason?: string
  ): Promise<EnrollmentRequest> {
    const result = await this.db.query<EnrollmentRequest>(
      `UPDATE enrollment_requests
       SET status = $1, processed_by = $2, processed_at = CURRENT_TIMESTAMP,
           rejection_reason = $3, updated_at = CURRENT_TIMESTAMP
       WHERE id = $4
       RETURNING ${REQUEST_COLUMNS()}`,
      [status, processedBy, reason ?? null, requestId]
    );
    return result.rows[0];
  }
}
