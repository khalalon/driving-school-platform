import { Pool } from 'pg';
import { CreateSchoolDTO, DEFAULT_CURRENCY, School, UpdateSchoolDTO } from '../types/school.types';

export interface ISchoolRepository {
  create(data: CreateSchoolDTO): Promise<School>;
  findById(id: string): Promise<School | null>;
  findAll(): Promise<School[]>;
  update(id: string, data: UpdateSchoolDTO): Promise<School>;
  delete(id: string): Promise<void>;
}

const SCHOOL_COLUMNS = `id, name, address, phone, email, logo_url AS "logoUrl", currency,
  created_at AS "createdAt", updated_at AS "updatedAt"`;

export class SchoolRepository implements ISchoolRepository {
  constructor(private readonly db: Pool) {}

  async create(data: CreateSchoolDTO): Promise<School> {
    const result = await this.db.query<School>(
      `INSERT INTO schools (name, address, phone, email, logo_url, currency)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING ${SCHOOL_COLUMNS}`,
      [
        data.name,
        data.address,
        data.phone,
        data.email,
        data.logoUrl ?? null,
        data.currency ?? DEFAULT_CURRENCY,
      ]
    );
    return result.rows[0];
  }

  async findById(id: string): Promise<School | null> {
    const result = await this.db.query<School>(
      `SELECT ${SCHOOL_COLUMNS} FROM schools WHERE id = $1`,
      [id]
    );
    return result.rows[0] ?? null;
  }

  async findAll(): Promise<School[]> {
    const result = await this.db.query<School>(
      `SELECT ${SCHOOL_COLUMNS} FROM schools ORDER BY created_at DESC`
    );
    return result.rows;
  }

  async update(id: string, data: UpdateSchoolDTO): Promise<School> {
    const result = await this.db.query<School>(
      `UPDATE schools
       SET name = COALESCE($2, name),
           address = COALESCE($3, address),
           phone = COALESCE($4, phone),
           email = COALESCE($5, email),
           logo_url = COALESCE($6, logo_url),
           currency = COALESCE($7, currency),
           updated_at = NOW()
       WHERE id = $1
       RETURNING ${SCHOOL_COLUMNS}`,
      [
        id,
        data.name ?? null,
        data.address ?? null,
        data.phone ?? null,
        data.email ?? null,
        data.logoUrl ?? null,
        data.currency ?? null,
      ]
    );
    return result.rows[0];
  }

  async delete(id: string): Promise<void> {
    await this.db.query(`DELETE FROM schools WHERE id = $1`, [id]);
  }
}
