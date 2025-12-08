import { Pool } from 'pg';
import { Student } from '../types';

export interface IStudentRepository {
  findById(id: string): Promise<Student | null>;
  findByUserId(userId: string): Promise<Student | null>;
}

export class StudentRepository implements IStudentRepository {
  constructor(private readonly db: Pool) {}

  async findById(id: string): Promise<Student | null> {
    const query = `
      SELECT 
        id,
        user_id as "userId",
        school_id as "schoolId",
        name,
        phone,
        address,
        authorized,
        profile_photo_url as "profilePhotoUrl",
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM students
      WHERE id = $1
    `;

    const result = await this.db.query(query, [id]);
    return result.rows[0] || null;
  }

  async findByUserId(userId: string): Promise<Student | null> {
    const query = `
      SELECT 
        id,
        user_id as "userId",
        school_id as "schoolId",
        name,
        phone,
        address,
        authorized,
        profile_photo_url as "profilePhotoUrl",
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM students
      WHERE user_id = $1
    `;

    const result = await this.db.query(query, [userId]);
    return result.rows[0] || null;
  }
}
