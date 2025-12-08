import { Pool } from 'pg';
import { NotificationPreference, UpdatePreferencesDTO, NotificationType } from '../types';

export interface IPreferenceRepository {
  findByUserId(userId: string): Promise<NotificationPreference[]>;
  findByUserAndType(userId: string, type: NotificationType): Promise<NotificationPreference | null>;
  upsert(userId: string, dto: UpdatePreferencesDTO): Promise<NotificationPreference>;
}

export class PreferenceRepository implements IPreferenceRepository {
  constructor(private readonly db: Pool) {}

  async findByUserId(userId: string): Promise<NotificationPreference[]> {
    const query = `
      SELECT 
        id,
        user_id as "userId",
        type,
        push_enabled as "pushEnabled",
        email_enabled as "emailEnabled",
        sms_enabled as "smsEnabled",
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM notification_preferences
      WHERE user_id = $1
    `;

    const result = await this.db.query(query, [userId]);
    return result.rows as NotificationPreference[];
  }

  async findByUserAndType(
    userId: string,
    type: NotificationType
  ): Promise<NotificationPreference | null> {
    const query = `
      SELECT 
        id,
        user_id as "userId",
        type,
        push_enabled as "pushEnabled",
        email_enabled as "emailEnabled",
        sms_enabled as "smsEnabled",
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM notification_preferences
      WHERE user_id = $1 AND type = $2
    `;

    const result = await this.db.query(query, [userId, type]);
    return result.rows[0] || null;
  }

  async upsert(userId: string, dto: UpdatePreferencesDTO): Promise<NotificationPreference> {
    const query = `
      INSERT INTO notification_preferences (
        user_id, type, push_enabled, email_enabled, sms_enabled,
        created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT (user_id, type)
      DO UPDATE SET
        push_enabled = COALESCE($3, notification_preferences.push_enabled),
        email_enabled = COALESCE($4, notification_preferences.email_enabled),
        sms_enabled = COALESCE($5, notification_preferences.sms_enabled),
        updated_at = CURRENT_TIMESTAMP
      RETURNING 
        id,
        user_id as "userId",
        type,
        push_enabled as "pushEnabled",
        email_enabled as "emailEnabled",
        sms_enabled as "smsEnabled",
        created_at as "createdAt",
        updated_at as "updatedAt"
    `;

    const result = await this.db.query(query, [
      userId,
      dto.type,
      dto.pushEnabled,
      dto.emailEnabled,
      dto.smsEnabled,
    ]);

    return result.rows[0] as NotificationPreference;
  }
}
