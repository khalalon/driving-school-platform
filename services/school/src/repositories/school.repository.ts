import { Pool } from 'pg';
import { DatabaseConfig } from '../config/database.config';
import { School, CreateSchoolDTO, UpdateSchoolDTO } from '../types';

export interface ISchoolRepository {
  create(data: CreateSchoolDTO): Promise<School>;
  findById(id: string): Promise<School | null>;
  findAll(): Promise<School[]>;
  update(id: string, data: UpdateSchoolDTO): Promise<School>;
  delete(id: string): Promise<void>;
}

export class SchoolRepository implements ISchoolRepository {
  private readonly db: Pool;

  constructor() {
    this.db = DatabaseConfig.getInstance();
  }

  async create(data: CreateSchoolDTO): Promise<School> {
    const result = await this.db.query(
      `INSERT INTO schools (name, address, phone, email, logo_url)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [data.name, data.address, data.phone, data.email, data.logoUrl || null]
    );
    return result.rows[0];
  }

  async findById(id: string): Promise<School | null> {
    const result = await this.db.query(`SELECT * FROM schools WHERE id = $1`, [id]);
    return result.rows[0] || null;
  }

  async findAll(): Promise<School[]> {
    const result = await this.db.query(`SELECT * FROM schools ORDER BY created_at DESC`);
    return result.rows;
  }

  async update(id: string, data: UpdateSchoolDTO): Promise<School> {
    const result = await this.db.query(
      `UPDATE schools
       SET name = COALESCE($2, name),
           address = COALESCE($3, address),
           phone = COALESCE($4, phone),
           email = COALESCE($5, email),
           logo_url = COALESCE($6, logo_url),
           updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id, data.name, data.address, data.phone, data.email, data.logoUrl || null]
    );
    return result.rows[0];
  }

  async delete(id: string): Promise<void> {
    await this.db.query(`DELETE FROM schools WHERE id = $1`, [id]);
  }
}
