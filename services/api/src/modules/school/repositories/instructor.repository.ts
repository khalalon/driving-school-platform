import { Pool } from 'pg';
import { CreateInstructorDTO, Instructor, UpdateInstructorDTO } from '../types/school.types';

export interface IInstructorRepository {
  create(schoolId: string, data: CreateInstructorDTO): Promise<Instructor>;
  findById(id: string): Promise<Instructor | null>;
  findBySchoolId(schoolId: string): Promise<Instructor[]>;
  update(id: string, data: UpdateInstructorDTO): Promise<Instructor>;
  delete(id: string): Promise<void>;
}

const INSTRUCTOR_COLUMNS = `id, school_id AS "schoolId", user_id AS "userId", name, phone,
  license_number AS "licenseNumber", specialties, created_at AS "createdAt", updated_at AS "updatedAt"`;

export class InstructorRepository implements IInstructorRepository {
  constructor(private readonly db: Pool) {}

  async create(schoolId: string, data: CreateInstructorDTO): Promise<Instructor> {
    const result = await this.db.query<Instructor>(
      `INSERT INTO instructors (school_id, user_id, name, phone, license_number, specialties)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING ${INSTRUCTOR_COLUMNS}`,
      [schoolId, data.userId, data.name, data.phone, data.licenseNumber, data.specialties]
    );
    return result.rows[0];
  }

  async findById(id: string): Promise<Instructor | null> {
    const result = await this.db.query<Instructor>(
      `SELECT ${INSTRUCTOR_COLUMNS} FROM instructors WHERE id = $1`,
      [id]
    );
    return result.rows[0] ?? null;
  }

  async findBySchoolId(schoolId: string): Promise<Instructor[]> {
    const result = await this.db.query<Instructor>(
      `SELECT ${INSTRUCTOR_COLUMNS} FROM instructors WHERE school_id = $1 ORDER BY created_at DESC`,
      [schoolId]
    );
    return result.rows;
  }

  async update(id: string, data: UpdateInstructorDTO): Promise<Instructor> {
    const result = await this.db.query<Instructor>(
      `UPDATE instructors
       SET name = COALESCE($2, name),
           phone = COALESCE($3, phone),
           license_number = COALESCE($4, license_number),
           specialties = COALESCE($5, specialties),
           updated_at = NOW()
       WHERE id = $1
       RETURNING ${INSTRUCTOR_COLUMNS}`,
      [
        id,
        data.name ?? null,
        data.phone ?? null,
        data.licenseNumber ?? null,
        data.specialties ?? null,
      ]
    );
    return result.rows[0];
  }

  async delete(id: string): Promise<void> {
    await this.db.query(`DELETE FROM instructors WHERE id = $1`, [id]);
  }
}
