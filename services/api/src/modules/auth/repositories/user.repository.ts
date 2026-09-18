import { Pool } from 'pg';
import { User, UserRole } from '../types/auth.types';

export interface IUserRepository {
  create(email: string, passwordHash: string, role: UserRole): Promise<User>;
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  updatePassword(id: string, passwordHash: string): Promise<void>;
}

const USER_COLUMNS = `id, email, password_hash AS "passwordHash", role,
  created_at AS "createdAt", updated_at AS "updatedAt"`;

export class UserRepository implements IUserRepository {
  constructor(private readonly db: Pool) {}

  async create(email: string, passwordHash: string, role: UserRole): Promise<User> {
    const result = await this.db.query<User>(
      `INSERT INTO users (email, password_hash, role, created_at, updated_at)
       VALUES ($1, $2, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       RETURNING ${USER_COLUMNS}`,
      [email, passwordHash, role]
    );
    return result.rows[0];
  }

  async findById(id: string): Promise<User | null> {
    const result = await this.db.query<User>(`SELECT ${USER_COLUMNS} FROM users WHERE id = $1`, [
      id,
    ]);
    return result.rows[0] ?? null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const result = await this.db.query<User>(`SELECT ${USER_COLUMNS} FROM users WHERE email = $1`, [
      email,
    ]);
    return result.rows[0] ?? null;
  }

  async updatePassword(id: string, passwordHash: string): Promise<void> {
    await this.db.query(
      `UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
      [passwordHash, id]
    );
  }
}
