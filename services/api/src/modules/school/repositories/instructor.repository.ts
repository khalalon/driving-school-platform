import { Pool } from 'pg';
import { CreateInstructorDTO, Instructor, UpdateInstructorDTO } from '../types/school.types';

export interface IInstructorRepository {
  create(schoolId: string, data: CreateInstructorDTO): Promise<Instructor>;
  findById(id: string): Promise<Instructor | null>;
  findBySchoolId(schoolId: string): Promise<Instructor[]>;
  update(id: string, data: UpdateInstructorDTO): Promise<Instructor>;
  delete(id: string): Promise<void>;
}

// Identité portée par users depuis 3.1 (D-16). `name` : dérivé, transitoire pour le mobile
// actuel (SchoolDetailScreen), repli sur instructors.name pour les lignes sans compte.
const INSTRUCTOR_COLUMNS = `i.id, i.school_id AS "schoolId", i.user_id AS "userId",
  COALESCE(u.first_name, '') AS "firstName", COALESCE(u.last_name, '') AS "lastName",
  COALESCE(NULLIF(trim(concat_ws(' ', u.first_name, u.last_name)), ''), i.name) AS name,
  i.phone, i.license_number AS "licenseNumber", i.specialties,
  i.created_at AS "createdAt", i.updated_at AS "updatedAt"`;

const INSTRUCTOR_FROM = `FROM instructors i LEFT JOIN users u ON i.user_id = u.id`;

export class InstructorRepository implements IInstructorRepository {
  constructor(private readonly db: Pool) {}

  async create(schoolId: string, data: CreateInstructorDTO): Promise<Instructor> {
    const result = await this.db.query<{ id: string }>(
      `INSERT INTO instructors (school_id, user_id, name, phone, license_number, specialties)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      [schoolId, data.userId, data.name ?? null, data.phone, data.licenseNumber, data.specialties]
    );
    return this.requireById(result.rows[0].id);
  }

  async findById(id: string): Promise<Instructor | null> {
    const result = await this.db.query<Instructor>(
      `SELECT ${INSTRUCTOR_COLUMNS} ${INSTRUCTOR_FROM} WHERE i.id = $1`,
      [id]
    );
    return result.rows[0] ?? null;
  }

  async findBySchoolId(schoolId: string): Promise<Instructor[]> {
    const result = await this.db.query<Instructor>(
      `SELECT ${INSTRUCTOR_COLUMNS} ${INSTRUCTOR_FROM}
       WHERE i.school_id = $1
       ORDER BY i.created_at DESC`,
      [schoolId]
    );
    return result.rows;
  }

  async update(id: string, data: UpdateInstructorDTO): Promise<Instructor> {
    await this.db.query(
      `UPDATE instructors
       SET name = COALESCE($2, name),
           phone = COALESCE($3, phone),
           license_number = COALESCE($4, license_number),
           specialties = COALESCE($5, specialties),
           updated_at = NOW()
       WHERE id = $1`,
      [
        id,
        data.name ?? null,
        data.phone ?? null,
        data.licenseNumber ?? null,
        data.specialties ?? null,
      ]
    );
    return this.requireById(id);
  }

  async delete(id: string): Promise<void> {
    await this.db.query(`DELETE FROM instructors WHERE id = $1`, [id]);
  }

  /** Relecture avec la jointure users après une écriture (RETURNING ne peut pas joindre). */
  private async requireById(id: string): Promise<Instructor> {
    const instructor = await this.findById(id);
    if (!instructor) {
      throw new Error(`Instructeur ${id} introuvable après écriture`);
    }
    return instructor;
  }
}
