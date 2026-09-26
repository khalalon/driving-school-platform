import { Pool } from 'pg';
import { Queryable } from '../../../db/transaction';
import { NewUser, User } from '../types/auth.types';

export interface IUserRepository {
  /** `executor` : client d'une transaction en cours (inscription avec code, 4.2), le pool sinon. */
  create(user: NewUser, executor?: Queryable): Promise<User>;
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  updatePassword(id: string, passwordHash: string): Promise<void>;
}

const USER_COLUMNS = `id, email, password_hash AS "passwordHash", role,
  first_name AS "firstName", last_name AS "lastName",
  created_at AS "createdAt", updated_at AS "updatedAt"`;

export class UserRepository implements IUserRepository {
  constructor(private readonly db: Pool) {}

  /** Coordonnées absentes → colonnes nulles (D-50) : un compte se crée sans elles. */
  async create(user: NewUser, executor: Queryable = this.db): Promise<User> {
    const contact = user.contact ?? {};
    const result = await executor.query<User>(
      `INSERT INTO users (email, password_hash, role, first_name, last_name,
                          phone, date_of_birth, address, emergency_contact, emergency_phone,
                          created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       RETURNING ${USER_COLUMNS}`,
      [
        user.email,
        user.passwordHash,
        user.role,
        user.firstName,
        user.lastName,
        contact.phone ?? null,
        contact.dateOfBirth ?? null,
        contact.address ?? null,
        contact.emergencyContact ?? null,
        contact.emergencyPhone ?? null,
      ]
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
