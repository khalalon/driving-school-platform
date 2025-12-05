import { Pool } from 'pg';
import { User, UserRole } from '../types';

export interface IUserRepository {
  create(email: string, passwordHash: string, role: UserRole): Promise<User>;
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  updatePassword(id: string, passwordHash: string): Promise<void>;
}

export class UserRepository implements IUserRepository {
  constructor(private readonly db: Pool) {}

  async create(email: string, passwordHash: string, role: UserRole): Promise<User> {
    const query = `
      INSERT INTO users (email, password_hash, role, created_at, updated_at)
      VALUES ($1, $2, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING id, email, password_hash as "passwordHash", role, created_at as "createdAt", updated_at as "updatedAt"
    `;
    
    const result = await this.db.query(query, [email, passwordHash, role]);
    return result.rows[0] as User;
  }

  async findById(id: string): Promise<User | null> {
    const query = `
      SELECT id, email, password_hash as "passwordHash", role, created_at as "createdAt", updated_at as "updatedAt"
      FROM users
      WHERE id = $1
    `;
    
    const result = await this.db.query(query, [id]);
    return result.rows[0] || null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const query = `
      SELECT id, email, password_hash as "passwordHash", role, created_at as "createdAt", updated_at as "updatedAt"
      FROM users
      WHERE email = $1
    `;
    
    const result = await this.db.query(query, [email]);
    return result.rows[0] || null;
  }

  async updatePassword(id: string, passwordHash: string): Promise<void> {
    const query = `
      UPDATE users
      SET password_hash = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `;
    
    await this.db.query(query, [passwordHash, id]);
  }
}
