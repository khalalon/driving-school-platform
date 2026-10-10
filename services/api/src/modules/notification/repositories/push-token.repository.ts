import { Pool } from 'pg';
import { PushToken, RegisterPushTokenDTO } from '../types/notification.types';

export interface IPushTokenRepository {
  /** N1 : upsert **sur le jeton** — un appareil qui change de compte change de `userId`. */
  upsert(userId: string, data: RegisterPushTokenDTO): Promise<PushToken>;
  /** N2 : ne retire que les jetons de ce compte (un compte n'en désinscrit pas un autre). */
  remove(userId: string, token: string): Promise<void>;
  /** Les appareils de plusieurs comptes, en une requête : un envoi groupé (17.3). */
  findByUsers(userIds: string[]): Promise<PushToken[]>;
  /** Jeton déclaré mort par Expo (`DeviceNotRegistered`) : retiré sans connaître son porteur. */
  removeByToken(token: string): Promise<void>;
}

const PUSH_TOKEN_COLUMNS = `id, user_id AS "userId", token, platform, language,
  updated_at AS "updatedAt"`;

export class PushTokenRepository implements IPushTokenRepository {
  constructor(private readonly db: Pool) {}

  async upsert(userId: string, data: RegisterPushTokenDTO): Promise<PushToken> {
    const result = await this.db.query<PushToken>(
      `INSERT INTO push_tokens (user_id, token, platform, language)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (token) DO UPDATE
         SET user_id = EXCLUDED.user_id,
             platform = EXCLUDED.platform,
             language = EXCLUDED.language,
             updated_at = CURRENT_TIMESTAMP
       RETURNING ${PUSH_TOKEN_COLUMNS}`,
      [userId, data.token, data.platform, data.language]
    );
    return result.rows[0];
  }

  async remove(userId: string, token: string): Promise<void> {
    await this.db.query(`DELETE FROM push_tokens WHERE user_id = $1 AND token = $2`, [
      userId,
      token,
    ]);
  }

  async findByUsers(userIds: string[]): Promise<PushToken[]> {
    if (userIds.length === 0) {
      return [];
    }
    const result = await this.db.query<PushToken>(
      `SELECT ${PUSH_TOKEN_COLUMNS} FROM push_tokens
       WHERE user_id = ANY($1::uuid[])
       ORDER BY updated_at DESC`,
      [[...new Set(userIds)]]
    );
    return result.rows;
  }

  async removeByToken(token: string): Promise<void> {
    await this.db.query(`DELETE FROM push_tokens WHERE token = $1`, [token]);
  }
}
