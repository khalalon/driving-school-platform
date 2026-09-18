import { Pool } from 'pg';
import {
  ExamHistory,
  FinancialSummary,
  LessonHistory,
  StudentProfile,
} from '../types/student.types';

export interface IProfileRepository {
  getStudentProfile(studentId: string, schoolId: string): Promise<StudentProfile | null>;
  getStudentLessons(studentId: string, schoolId: string): Promise<LessonHistory[]>;
  getStudentExams(studentId: string, schoolId: string): Promise<ExamHistory[]>;
  getFinancialSummary(studentId: string, schoolId: string): Promise<FinancialSummary>;
  updateNotes(studentId: string, notes: string): Promise<void>;
  markLessonPaid(bookingId: string, amount: number, paymentMethod: string): Promise<void>;
  markExamPaid(registrationId: string, amount: number, paymentMethod: string): Promise<void>;
}

type ProfileRow = Omit<StudentProfile, 'totalLessons' | 'totalExams' | 'passedExams'>;

/** `:studentId` = students.id aujourd'hui ; passe à users.id en 5.0 (D-28). */
export class ProfileRepository implements IProfileRepository {
  constructor(private readonly db: Pool) {}

  async getStudentProfile(studentId: string, schoolId: string): Promise<StudentProfile | null> {
    const profile = await this.db.query<ProfileRow>(
      `SELECT s.id, s.user_id AS "userId", u.first_name AS "firstName", u.last_name AS "lastName",
              u.email, s.phone, s.address,
              s.date_of_birth AS "dateOfBirth", s.license_number AS "licenseNumber",
              s.profile_photo_url AS "profilePhotoUrl", s.enrollment_date AS "enrollmentDate",
              s.emergency_contact AS "emergencyContact", s.emergency_phone AS "emergencyPhone",
              s.notes, COALESCE(sls.completed_lessons, 0)::int AS "completedLessons"
       FROM students s
       LEFT JOIN users u ON s.user_id = u.id
       LEFT JOIN student_lesson_stats sls ON s.id = sls.student_id AND sls.school_id = $2
       WHERE s.id = $1 AND s.school_id = $2`,
      [studentId, schoolId]
    );
    const student = profile.rows[0];
    if (!student) {
      return null;
    }

    const [lessonCount, examStats] = await Promise.all([
      this.db.query<{ total: string }>(
        `SELECT COUNT(*) AS total
         FROM lesson_bookings lb
         JOIN lessons l ON lb.lesson_id = l.id
         WHERE lb.student_id = $1 AND l.school_id = $2`,
        [studentId, schoolId]
      ),
      this.db.query<{ total: string; passed: string }>(
        `SELECT COUNT(*) AS total, COUNT(CASE WHEN result = 'passed' THEN 1 END) AS passed
         FROM exam_registrations er
         JOIN exams e ON er.exam_id = e.id
         WHERE er.student_id = $1 AND e.school_id = $2`,
        [studentId, schoolId]
      ),
    ]);

    return {
      ...student,
      totalLessons: Number(lessonCount.rows[0].total),
      totalExams: Number(examStats.rows[0].total),
      passedExams: Number(examStats.rows[0].passed),
    };
  }

  async getStudentLessons(studentId: string, schoolId: string): Promise<LessonHistory[]> {
    const result = await this.db.query<LessonHistory>(
      `SELECT lb.id, l.id AS "lessonId", l.type AS "lessonType", l.date_time AS "dateTime",
              l.duration_minutes AS duration,
              COALESCE(NULLIF(trim(concat_ws(' ', iu.first_name, iu.last_name)), ''), i.name) AS "instructorName",
              lb.attended, lb.feedback,
              lb.rating, COALESCE(lb.paid, false) AS paid, lb.amount::float8 AS amount,
              lb.payment_date AS "paymentDate", lb.payment_method AS "paymentMethod"
       FROM lesson_bookings lb
       JOIN lessons l ON lb.lesson_id = l.id
       LEFT JOIN instructors i ON l.instructor_id = i.id
       LEFT JOIN users iu ON i.user_id = iu.id
       WHERE lb.student_id = $1 AND l.school_id = $2
       ORDER BY l.date_time DESC`,
      [studentId, schoolId]
    );
    return result.rows;
  }

  async getStudentExams(studentId: string, schoolId: string): Promise<ExamHistory[]> {
    const result = await this.db.query<ExamHistory>(
      `SELECT er.id, e.id AS "examId", e.type AS "examType", e.date_time AS "dateTime", er.result,
              er.score, er.notes, COALESCE(er.paid, false) AS paid, er.amount::float8 AS amount,
              er.payment_date AS "paymentDate", er.payment_method AS "paymentMethod"
       FROM exam_registrations er
       JOIN exams e ON er.exam_id = e.id
       WHERE er.student_id = $1 AND e.school_id = $2
       ORDER BY e.date_time DESC`,
      [studentId, schoolId]
    );
    return result.rows;
  }

  async getFinancialSummary(studentId: string, schoolId: string): Promise<FinancialSummary> {
    const [lessons, exams, lastPayment] = await Promise.all([
      this.db.query<{ lessonsRevenue: string; lessonsPending: string }>(
        `SELECT COALESCE(SUM(CASE WHEN lb.paid = true THEN lb.amount ELSE 0 END), 0) AS "lessonsRevenue",
                COALESCE(SUM(CASE WHEN COALESCE(lb.paid, false) = false THEN COALESCE(lb.amount, l.price) ELSE 0 END), 0) AS "lessonsPending"
         FROM lesson_bookings lb
         JOIN lessons l ON lb.lesson_id = l.id
         WHERE lb.student_id = $1 AND l.school_id = $2`,
        [studentId, schoolId]
      ),
      this.db.query<{ examsRevenue: string; examsPending: string }>(
        `SELECT COALESCE(SUM(CASE WHEN er.paid = true THEN er.amount ELSE 0 END), 0) AS "examsRevenue",
                COALESCE(SUM(CASE WHEN COALESCE(er.paid, false) = false THEN COALESCE(er.amount, e.price) ELSE 0 END), 0) AS "examsPending"
         FROM exam_registrations er
         JOIN exams e ON er.exam_id = e.id
         WHERE er.student_id = $1 AND e.school_id = $2`,
        [studentId, schoolId]
      ),
      this.db.query<{ lastPaymentDate: Date | null }>(
        `SELECT MAX(payment_date) AS "lastPaymentDate"
         FROM (
           SELECT lb.payment_date FROM lesson_bookings lb
           JOIN lessons l ON lb.lesson_id = l.id
           WHERE lb.student_id = $1 AND l.school_id = $2 AND lb.paid = true
           UNION ALL
           SELECT er.payment_date FROM exam_registrations er
           JOIN exams e ON er.exam_id = e.id
           WHERE er.student_id = $1 AND e.school_id = $2 AND er.paid = true
         ) payments`,
        [studentId, schoolId]
      ),
    ]);

    const lessonsRevenue = Number(lessons.rows[0].lessonsRevenue);
    const lessonsPending = Number(lessons.rows[0].lessonsPending);
    const examsRevenue = Number(exams.rows[0].examsRevenue);
    const examsPending = Number(exams.rows[0].examsPending);

    return {
      totalRevenue: lessonsRevenue + examsRevenue,
      totalPending: lessonsPending + examsPending,
      totalDue: lessonsPending + examsPending,
      lessonsRevenue,
      examsRevenue,
      lessonsPending,
      examsPending,
      lastPaymentDate: lastPayment.rows[0]?.lastPaymentDate ?? null,
    };
  }

  async updateNotes(studentId: string, notes: string): Promise<void> {
    await this.db.query(
      `UPDATE students SET notes = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
      [notes, studentId]
    );
  }

  async markLessonPaid(bookingId: string, amount: number, paymentMethod: string): Promise<void> {
    await this.db.query(
      `UPDATE lesson_bookings
       SET paid = true, amount = $1, payment_method = $2, payment_date = CURRENT_TIMESTAMP
       WHERE id = $3`,
      [amount, paymentMethod, bookingId]
    );
  }

  async markExamPaid(registrationId: string, amount: number, paymentMethod: string): Promise<void> {
    await this.db.query(
      `UPDATE exam_registrations
       SET paid = true, amount = $1, payment_method = $2, payment_date = CURRENT_TIMESTAMP
       WHERE id = $3`,
      [amount, paymentMethod, registrationId]
    );
  }
}
