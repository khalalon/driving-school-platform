import { Pool } from 'pg';
import { PushToken } from '../types';

export interface IPushTokenRepository {
  upsert(userId: string, token: string, platform: 'ios' | 'android' | 'web'): Promise<PushToken>;
  findByUserId(userId: string): Promise<PushToken[]>;
  delete(token: string): Promise<void>;
}

export class PushTokenRepository implements IPushTokenRepository {
  constructor(private readonly db: Pool) {}

  async upsert(
    userId: string,
    token: string,
    platform: 'ios' | 'android' | 'web'
  ): Promise<PushToken> {
    const query = `
      INSERT INTO push_tokens (user_id, token, platform, created_at)
      VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
      ON CONFLICT (token)
      DO UPDATE SET user_id = $1, platform = $3
      RETURNING 
        id,
        user_id as "userId",
        token,
        platform,
        created_at as "createdAt"
    `;

    const result = await this.db.query(query, [userId, token, platform]);
    return result.rows[0] as PushToken;
  }

  async findByUserId(userId: string): Promise<PushToken[]> {
    const query = `
      SELECT 
        id,
        user_id as "userId",
        token,
        platform,
        created_at as "createdAt"
      FROM push_tokens
      WHERE user_id = $1
    `;

    const result = await this.db.query(query, [userId]);
    return result.rows as PushToken[];
  }

  async delete(token: string): Promise<void> {
    const query = 'DELETE FROM push_tokens WHERE token = $1';
    await this.db.query(query, [token]);
  }
}
