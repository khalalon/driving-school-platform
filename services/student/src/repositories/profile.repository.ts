/**
 * Profile Repository
 * Single Responsibility: Database access for student profiles
 * Dependency Inversion: Implements IProfileRepository interface
 */

import { Pool } from 'pg';
import { DatabaseConfig } from '../config/database.config';
import {
  StudentProfile,
  LessonHistory,
  ExamHistory,
  FinancialSummary,
} from '../types';

export interface IProfileRepository {
  getStudentProfile(studentId: string, schoolId: string): Promise<StudentProfile | null>;
  getStudentLessons(studentId: string, schoolId: string): Promise<LessonHistory[]>;
  getStudentExams(studentId: string, schoolId: string): Promise<ExamHistory[]>;
  getFinancialSummary(studentId: string, schoolId: string): Promise<FinancialSummary>;
  updateNotes(studentId: string, notes: string): Promise<void>;
  markLessonPaid(bookingId: string, amount: number, paymentMethod: string): Promise<void>;
  markExamPaid(registrationId: string, amount: number, paymentMethod: string): Promise<void>;
}

export class ProfileRepository implements IProfileRepository {
  private readonly db: Pool;

  constructor() {
    this.db = DatabaseConfig.getInstance();
  }

  async getStudentProfile(studentId: string, schoolId: string): Promise<StudentProfile | null> {
    const query = `
      SELECT 
        s.id,
        s.user_id as "userId",
        s.name,
        u.email,
        s.phone,
        s.address,
        s.date_of_birth as "dateOfBirth",
        s.license_number as "licenseNumber",
        s.profile_photo_url as "profilePhotoUrl",
        s.enrollment_date as "enrollmentDate",
        s.emergency_contact as "emergencyContact",
        s.emergency_phone as "emergencyPhone",
        s.notes,
        COALESCE(sls.completed_lessons, 0) as "completedLessons"
      FROM students s
      LEFT JOIN users u ON s.user_id = u.id
      LEFT JOIN student_lesson_stats sls ON s.id = sls.student_id AND sls.school_id = $2
      WHERE s.id = $1 AND s.school_id = $2
    `;

    const result = await this.db.query(query, [studentId, schoolId]);
    if (result.rows.length === 0) {
      return null;
    }

    const student = result.rows[0];

    // Get lesson count
    const lessonCountQuery = `
      SELECT COUNT(*) as total 
      FROM lesson_bookings lb
      JOIN lessons l ON lb.lesson_id = l.id
      WHERE lb.student_id = $1 AND l.school_id = $2
    `;
    const lessonCount = await this.db.query(lessonCountQuery, [studentId, schoolId]);

    // Get exam stats
    const examStatsQuery = `
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN result = 'passed' THEN 1 END) as passed
      FROM exam_registrations er
      JOIN exams e ON er.exam_id = e.id
      WHERE er.student_id = $1 AND e.school_id = $2
    `;
    const examStats = await this.db.query(examStatsQuery, [studentId, schoolId]);

    return {
      ...student,
      totalLessons: parseInt(lessonCount.rows[0].total) || 0,
      completedLessons: student.completedLessons || 0,
      totalExams: parseInt(examStats.rows[0].total) || 0,
      passedExams: parseInt(examStats.rows[0].passed) || 0,
    };
  }

  async getStudentLessons(studentId: string, schoolId: string): Promise<LessonHistory[]> {
    const query = `
      SELECT 
        lb.id,
        l.id as "lessonId",
        l.type as "lessonType",
        l.date_time as "dateTime",
        l.duration_minutes as duration,
        i.name as "instructorName",
        lb.attended,
        lb.feedback,
        lb.rating,
        COALESCE(lb.paid, false) as paid,
        lb.amount,
        lb.payment_date as "paymentDate",
        lb.payment_method as "paymentMethod"
      FROM lesson_bookings lb
      JOIN lessons l ON lb.lesson_id = l.id
      LEFT JOIN instructors i ON l.instructor_id = i.id
      WHERE lb.student_id = $1 AND l.school_id = $2
      ORDER BY l.date_time DESC
    `;

    const result = await this.db.query(query, [studentId, schoolId]);
    return result.rows;
  }

  async getStudentExams(studentId: string, schoolId: string): Promise<ExamHistory[]> {
    const query = `
      SELECT 
        er.id,
        e.id as "examId",
        e.type as "examType",
        e.date_time as "dateTime",
        er.result,
        er.score,
        er.notes,
        COALESCE(er.paid, false) as paid,
        er.amount,
        er.payment_date as "paymentDate",
        er.payment_method as "paymentMethod"
      FROM exam_registrations er
      JOIN exams e ON er.exam_id = e.id
      WHERE er.student_id = $1 AND e.school_id = $2
      ORDER BY e.date_time DESC
    `;

    const result = await this.db.query(query, [studentId, schoolId]);
    return result.rows;
  }

  async getFinancialSummary(studentId: string, schoolId: string): Promise<FinancialSummary> {
    // Lessons financial
    const lessonsQuery = `
      SELECT 
        COALESCE(SUM(CASE WHEN lb.paid = true THEN lb.amount ELSE 0 END), 0) as "lessonsRevenue",
        COALESCE(SUM(CASE WHEN COALESCE(lb.paid, false) = false THEN COALESCE(lb.amount, l.price) ELSE 0 END), 0) as "lessonsPending"
      FROM lesson_bookings lb
      JOIN lessons l ON lb.lesson_id = l.id
      WHERE lb.student_id = $1 AND l.school_id = $2
    `;

    // Exams financial
    const examsQuery = `
      SELECT 
        COALESCE(SUM(CASE WHEN er.paid = true THEN er.amount ELSE 0 END), 0) as "examsRevenue",
        COALESCE(SUM(CASE WHEN COALESCE(er.paid, false) = false THEN COALESCE(er.amount, e.price) ELSE 0 END), 0) as "examsPending"
      FROM exam_registrations er
      JOIN exams e ON er.exam_id = e.id
      WHERE er.student_id = $1 AND e.school_id = $2
    `;

    // Last payment date
    const lastPaymentQuery = `
      SELECT MAX(payment_date) as "lastPaymentDate"
      FROM (
        SELECT lb.payment_date 
        FROM lesson_bookings lb
        JOIN lessons l ON lb.lesson_id = l.id
        WHERE lb.student_id = $1 AND l.school_id = $2 AND lb.paid = true
        UNION ALL
        SELECT er.payment_date 
        FROM exam_registrations er
        JOIN exams e ON er.exam_id = e.id
        WHERE er.student_id = $1 AND e.school_id = $2 AND er.paid = true
      ) payments
    `;

    const [lessons, exams, lastPayment] = await Promise.all([
      this.db.query(lessonsQuery, [studentId, schoolId]),
      this.db.query(examsQuery, [studentId, schoolId]),
      this.db.query(lastPaymentQuery, [studentId, schoolId]),
    ]);

    const lessonsRevenue = parseFloat(lessons.rows[0].lessonsRevenue);
    const lessonsPending = parseFloat(lessons.rows[0].lessonsPending);
    const examsRevenue = parseFloat(exams.rows[0].examsRevenue);
    const examsPending = parseFloat(exams.rows[0].examsPending);

    return {
      totalRevenue: lessonsRevenue + examsRevenue,
      totalPending: lessonsPending + examsPending,
      totalDue: lessonsPending + examsPending,
      lessonsRevenue,
      examsRevenue,
      lessonsPending,
      examsPending,
      lastPaymentDate: lastPayment.rows[0]?.lastPaymentDate || null,
    };
  }

  async updateNotes(studentId: string, notes: string): Promise<void> {
    const query = `
      UPDATE students 
      SET notes = $1, updated_at = CURRENT_TIMESTAMP 
      WHERE id = $2
    `;
    await this.db.query(query, [notes, studentId]);
  }

  async markLessonPaid(bookingId: string, amount: number, paymentMethod: string): Promise<void> {
    const query = `
      UPDATE lesson_bookings 
      SET 
        paid = true,
        amount = $1,
        payment_method = $2,
        payment_date = CURRENT_TIMESTAMP
      WHERE id = $3
    `;
    await this.db.query(query, [amount, paymentMethod, bookingId]);
  }

  async markExamPaid(registrationId: string, amount: number, paymentMethod: string): Promise<void> {
    const query = `
      UPDATE exam_registrations 
      SET 
        paid = true,
        amount = $1,
        payment_method = $2,
        payment_date = CURRENT_TIMESTAMP
      WHERE id = $3
    `;
    await this.db.query(query, [amount, paymentMethod, registrationId]);
  }
}