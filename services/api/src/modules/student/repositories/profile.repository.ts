import { Pool } from 'pg';
import { LessonType } from '../../../types/domain';
import {
  ExamHistory,
  FinancialSummary,
  LessonHistory,
  StudentProfile,
} from '../types/student.types';

/** Ligne de P1 / P8 : les compteurs par type arrivent à plat, puis sont regroupés (D-45). */
type StudentProfileRow = Omit<StudentProfile, 'completedLessonsByType'> & {
  completedCode: number;
  completedManoeuvre: number;
  completedParc: number;
};

export interface IProfileRepository {
  getStudentProfile(userId: string, schoolId: string): Promise<StudentProfile | null>;
  getStudentLessons(userId: string, schoolId: string): Promise<LessonHistory[]>;
  getStudentExams(userId: string, schoolId: string): Promise<ExamHistory[]>;
  getFinancialSummary(userId: string, schoolId: string): Promise<FinancialSummary>;
  /** École de la fiche `students` de l'utilisateur (unique, D-22), pour le cloisonnement de P5. */
  findStudentSchool(userId: string): Promise<string | null>;
  /**
   * École de la leçon (P6, cloisonnement) et présence : une absence n'est pas facturable
   * (D-41). `null` si la leçon est inconnue.
   */
  findLessonBilling(
    lessonId: string
  ): Promise<{ schoolId: string; attended: boolean | null } | null>;
  /** École de l'examen (P7), pour le cloisonnement ; `null` si inconnu. */
  findExamSchool(examId: string): Promise<string | null>;
  /** `false` si aucune fiche `students` pour cet utilisateur. */
  updateNotes(userId: string, notes: string): Promise<boolean>;
  /** `false` si la leçon n'existe pas. */
  markLessonPaid(lessonId: string, amount: number, paymentMethod: string): Promise<boolean>;
  /** `false` si l'examen n'existe pas. */
  markExamPaid(examId: string, amount: number, paymentMethod: string): Promise<boolean>;
}

/**
 * Fiche élève (P1–P11). `userId` = users.id partout (D-28) : la ligne `students` est résolue par
 * `user_id` + `school_id`. Leçons et examens viennent de `lessons` / `exams` (schémas 007 / 008) ;
 * seules les leçons et examens planifiés ou passés comptent (les demandes en attente, refusées
 * ou annulées ne sont pas des leçons suivies).
 */
export class ProfileRepository implements IProfileRepository {
  constructor(private readonly db: Pool) {}

  /**
   * Compteurs par type (D-45) : leçons `completed` avec présence, comme `completed_lessons`
   * (L7 n'incrémente que si `attended = true`, D-33), mais comptées dans `lessons`.
   */
  async getStudentProfile(userId: string, schoolId: string): Promise<StudentProfile | null> {
    const result = await this.db.query<StudentProfileRow>(
      `SELECT u.id, u.first_name AS "firstName", u.last_name AS "lastName", u.email,
              s.phone, s.address, s.date_of_birth AS "dateOfBirth",
              s.license_number AS "licenseNumber", s.enrollment_date AS "enrollmentDate",
              s.emergency_contact AS "emergencyContact", s.emergency_phone AS "emergencyPhone",
              s.notes,
              (SELECT count(*) FROM lessons l
                WHERE l.student_id = s.id AND l.status IN ('scheduled', 'completed'))::int
                AS "totalLessons",
              COALESCE(sls.completed_lessons, 0)::int AS "completedLessons",
              done.code AS "completedCode", done.manoeuvre AS "completedManoeuvre",
              done.parc AS "completedParc",
              (SELECT count(*) FROM exams e
                WHERE e.student_id = s.id AND e.status IN ('scheduled', 'completed'))::int
                AS "totalExams",
              (SELECT count(*) FROM exams e
                WHERE e.student_id = s.id AND e.result = 'passed')::int AS "passedExams"
       FROM students s
       JOIN users u ON u.id = s.user_id
       LEFT JOIN student_lesson_stats sls ON sls.student_id = s.id AND sls.school_id = s.school_id
       LEFT JOIN LATERAL (
         SELECT (count(*) FILTER (WHERE l.type = $3))::int AS code,
                (count(*) FILTER (WHERE l.type = $4))::int AS manoeuvre,
                (count(*) FILTER (WHERE l.type = $5))::int AS parc
         FROM lessons l
         WHERE l.student_id = s.id AND l.status = 'completed' AND l.attended = TRUE
       ) done ON TRUE
       WHERE s.user_id = $1 AND s.school_id = $2`,
      [userId, schoolId, LessonType.CODE, LessonType.MANOEUVRE, LessonType.PARC]
    );
    const row = result.rows[0];
    if (!row) return null;
    const { completedCode, completedManoeuvre, completedParc, ...profile } = row;
    return {
      ...profile,
      completedLessonsByType: {
        [LessonType.CODE]: completedCode,
        [LessonType.MANOEUVRE]: completedManoeuvre,
        [LessonType.PARC]: completedParc,
      },
    };
  }

  async getStudentLessons(userId: string, schoolId: string): Promise<LessonHistory[]> {
    const result = await this.db.query<LessonHistory>(
      `SELECT l.id, l.type, l.status, l.scheduled_date AS "scheduledDate",
              l.duration_minutes AS "durationMinutes",
              COALESCE(iu.first_name, '') AS "instructorFirstName",
              COALESCE(iu.last_name, '') AS "instructorLastName",
              l.attended, l.feedback, l.rating, l.paid, l.price::float8 AS price,
              l.amount::float8 AS amount, l.payment_date AS "paymentDate",
              l.payment_method AS "paymentMethod", l.credit_applied::float8 AS "creditApplied"
       FROM lessons l
       JOIN students s ON s.id = l.student_id
       LEFT JOIN instructors i ON i.id = l.instructor_id
       LEFT JOIN users iu ON iu.id = i.user_id
       WHERE s.user_id = $1 AND l.school_id = $2
         AND l.status IN ('scheduled', 'completed', 'cancelled')
       ORDER BY l.scheduled_date DESC NULLS LAST, l.created_at DESC`,
      [userId, schoolId]
    );
    return result.rows;
  }

  async getStudentExams(userId: string, schoolId: string): Promise<ExamHistory[]> {
    const result = await this.db.query<ExamHistory>(
      `SELECT e.id, e.type, e.status, e.date_time AS "dateTime", e.location, e.result, e.score,
              e.notes, e.paid, e.price::float8 AS price, e.amount::float8 AS amount,
              e.payment_date AS "paymentDate", e.payment_method AS "paymentMethod"
       FROM exams e
       JOIN students s ON s.id = e.student_id
       WHERE s.user_id = $1 AND e.school_id = $2
         AND e.status IN ('scheduled', 'completed', 'cancelled')
       ORDER BY e.date_time DESC NULLS LAST, e.created_at DESC`,
      [userId, schoolId]
    );
    return result.rows;
  }

  /**
   * Encaissé = argent versé (`amount` des leçons / examens payés ; une leçon réglée par l'avoir
   * vaut 0 — D-40) ; dû = leçons et examens planifiés ou passés non payés, au montant saisi
   * (reste après avoir) sinon au prix — une absence (`attended = false`) n'est pas due (D-41) ;
   * `credit` = avoir disponible de l'élève (D-40).
   */
  async getFinancialSummary(userId: string, schoolId: string): Promise<FinancialSummary> {
    const result = await this.db.query<{
      lessonsRevenue: string;
      lessonsPending: string;
      examsRevenue: string;
      examsPending: string;
      lastPaymentDate: Date | null;
      credit: string | null;
    }>(
      `WITH student AS (SELECT id, credit FROM students WHERE user_id = $1 AND school_id = $2),
       lessons_summary AS (
         SELECT COALESCE(SUM(CASE WHEN l.paid THEN l.amount END), 0) AS revenue,
                COALESCE(SUM(CASE WHEN NOT l.paid AND l.status IN ('scheduled', 'completed')
                                       AND l.attended IS DISTINCT FROM FALSE
                                  THEN COALESCE(l.amount, l.price) END), 0) AS pending,
                MAX(CASE WHEN l.paid THEN l.payment_date END) AS last_payment
         FROM lessons l WHERE l.student_id IN (SELECT id FROM student)
       ),
       exams_summary AS (
         SELECT COALESCE(SUM(CASE WHEN e.paid THEN e.amount END), 0) AS revenue,
                COALESCE(SUM(CASE WHEN NOT e.paid AND e.status IN ('scheduled', 'completed')
                                  THEN COALESCE(e.amount, e.price) END), 0) AS pending,
                MAX(CASE WHEN e.paid THEN e.payment_date END) AS last_payment
         FROM exams e WHERE e.student_id IN (SELECT id FROM student)
       )
       SELECT ls.revenue AS "lessonsRevenue", ls.pending AS "lessonsPending",
              es.revenue AS "examsRevenue", es.pending AS "examsPending",
              GREATEST(ls.last_payment, es.last_payment) AS "lastPaymentDate",
              (SELECT credit FROM student) AS credit
       FROM lessons_summary ls, exams_summary es`,
      [userId, schoolId]
    );
    const row = result.rows[0];
    const lessonsRevenue = Number(row.lessonsRevenue);
    const lessonsPending = Number(row.lessonsPending);
    const examsRevenue = Number(row.examsRevenue);
    const examsPending = Number(row.examsPending);

    return {
      totalRevenue: lessonsRevenue + examsRevenue,
      totalPending: lessonsPending + examsPending,
      totalDue: lessonsPending + examsPending,
      lessonsRevenue,
      examsRevenue,
      lessonsPending,
      examsPending,
      lastPaymentDate: row.lastPaymentDate ?? null,
      credit: Number(row.credit ?? 0),
    };
  }

  findStudentSchool(userId: string): Promise<string | null> {
    return this.findSchoolOf('students', 'user_id', userId);
  }

  async findLessonBilling(
    lessonId: string
  ): Promise<{ schoolId: string; attended: boolean | null } | null> {
    const result = await this.db.query<{ schoolId: string; attended: boolean | null }>(
      `SELECT school_id AS "schoolId", attended FROM lessons WHERE id = $1`,
      [lessonId]
    );
    return result.rows[0] ?? null;
  }

  findExamSchool(examId: string): Promise<string | null> {
    return this.findSchoolOf('exams', 'id', examId);
  }

  /** Une seule fiche par utilisateur (D-22, unique students.user_id) : pas d'école à préciser. */
  async updateNotes(userId: string, notes: string): Promise<boolean> {
    const result = await this.db.query(
      `UPDATE students SET notes = $1, updated_at = CURRENT_TIMESTAMP WHERE user_id = $2`,
      [notes, userId]
    );
    return (result.rowCount ?? 0) > 0;
  }

  async markLessonPaid(lessonId: string, amount: number, paymentMethod: string): Promise<boolean> {
    const result = await this.db.query(
      `UPDATE lessons
       SET paid = TRUE, amount = $1, payment_method = $2, payment_date = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $3`,
      [amount, paymentMethod, lessonId]
    );
    return (result.rowCount ?? 0) > 0;
  }

  async markExamPaid(examId: string, amount: number, paymentMethod: string): Promise<boolean> {
    const result = await this.db.query(
      `UPDATE exams
       SET paid = TRUE, amount = $1, payment_method = $2, payment_date = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $3`,
      [amount, paymentMethod, examId]
    );
    return (result.rowCount ?? 0) > 0;
  }

  // Tables et colonnes fixées par les appelants ci-dessus : jamais issues d'une entrée utilisateur.
  private async findSchoolOf(
    table: 'students' | 'exams',
    column: 'id' | 'user_id',
    value: string
  ): Promise<string | null> {
    const result = await this.db.query<{ schoolId: string }>(
      `SELECT school_id AS "schoolId" FROM ${table} WHERE ${column} = $1 LIMIT 1`,
      [value]
    );
    return result.rows[0]?.schoolId ?? null;
  }
}
