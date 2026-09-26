import { Pool } from 'pg';
import { Queryable } from '../../../db/transaction';
import { CreateStudentDTO, SchoolStudent, Student } from '../types/student.types';

export interface IStudentRepository {
  /** `executor` : client d'une transaction en cours (3.2), le pool sinon. */
  create(data: CreateStudentDTO, executor?: Queryable): Promise<Student>;
  findById(id: string): Promise<Student | null>;
  findByUserId(userId: string): Promise<Student | null>;
  findByUserAndSchool(userId: string, schoolId: string): Promise<Student | null>;
  findBySchool(schoolId: string): Promise<Student[]>;
  /** S6 : élèves autorisés de l'école, identifiés par users.id (D-25). */
  listSchoolRoster(schoolId: string): Promise<SchoolStudent[]>;
  /**
   * Avoir de l'élève (D-40), verrouillé (`FOR UPDATE`) pour la durée de la transaction ; 0 sans
   * fiche. `userId` = users.id (une seule fiche par élève, D-22).
   */
  getCreditForUpdate(userId: string, executor?: Queryable): Promise<number>;
  /** Ajoute `delta` (négatif pour une imputation) à l'avoir ; renvoie le nouveau solde. */
  addCredit(userId: string, delta: number, executor?: Queryable): Promise<number>;
}

const STUDENT_COLUMNS = (alias = ''): string => {
  const p = alias ? `${alias}.` : '';
  return `${p}id, ${p}user_id AS "userId", ${p}school_id AS "schoolId", ${p}authorized,
    ${p}enrollment_request_id AS "enrollmentRequestId", ${p}enrollment_date AS "enrollmentDate",
    ${p}credit::float8 AS credit,
    ${p}created_at AS "createdAt", ${p}updated_at AS "updatedAt"`;
};

export class StudentRepository implements IStudentRepository {
  constructor(private readonly db: Pool) {}

  /**
   * Sans `name` : l'identité est portée par `users` (006).
   *
   * Les coordonnées saisies à l'inscription vivent sur le compte (D-50, migration 014) : la fiche
   * les recopie ici, **dans la même instruction**, au moment où l'école approuve (E5, 12.2). Un
   * compte sans coordonnées laisse simplement des colonnes nulles.
   */
  async create(data: CreateStudentDTO, executor: Queryable = this.db): Promise<Student> {
    const result = await executor.query<Student>(
      `INSERT INTO students (user_id, school_id, authorized, enrollment_request_id, enrollment_date,
                             phone, date_of_birth, address, emergency_contact, emergency_phone)
       SELECT $1, $2, $3, $4, CURRENT_TIMESTAMP,
              u.phone, u.date_of_birth, u.address, u.emergency_contact, u.emergency_phone
       FROM users u
       WHERE u.id = $1
       RETURNING ${STUDENT_COLUMNS()}`,
      [data.userId, data.schoolId, data.authorized, data.enrollmentRequestId ?? null]
    );
    const student = result.rows[0];
    if (!student) {
      // `INSERT ... SELECT` n'insère rien si le compte n'existe pas : mieux vaut le dire que
      // renvoyer une fiche vide (la clé étrangère rendait l'ancien code bruyant, pas celui-ci).
      throw new Error(`Compte introuvable pour la fiche élève : ${data.userId}`);
    }
    return student;
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

  async listSchoolRoster(schoolId: string): Promise<SchoolStudent[]> {
    const result = await this.db.query<SchoolStudent>(
      `SELECT s.user_id AS "studentId", u.first_name AS "firstName", u.last_name AS "lastName",
              u.email, s.phone, s.enrollment_date AS "enrollmentDate",
              COALESCE(sls.completed_lessons, 0)::int AS "completedLessons"
       FROM students s
       JOIN users u ON u.id = s.user_id
       LEFT JOIN student_lesson_stats sls ON sls.student_id = s.id AND sls.school_id = s.school_id
       WHERE s.school_id = $1 AND s.authorized = TRUE
       ORDER BY u.last_name, u.first_name`,
      [schoolId]
    );
    return result.rows;
  }
  async getCreditForUpdate(userId: string, executor: Queryable = this.db): Promise<number> {
    const result = await executor.query<{ credit: number }>(
      `SELECT credit::float8 AS credit FROM students WHERE user_id = $1 FOR UPDATE`,
      [userId]
    );
    return result.rows[0]?.credit ?? 0;
  }

  async addCredit(userId: string, delta: number, executor: Queryable = this.db): Promise<number> {
    const result = await executor.query<{ credit: number }>(
      `UPDATE students SET credit = credit + $2, updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $1
       RETURNING credit::float8 AS credit`,
      [userId, delta]
    );
    const row = result.rows[0];
    if (!row) {
      throw new Error(`Fiche élève introuvable pour l'utilisateur ${userId}`);
    }
    return row.credit;
  }
}
