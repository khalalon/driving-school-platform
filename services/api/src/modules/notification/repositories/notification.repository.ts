import { Pool } from 'pg';
import {
  NotificationTarget,
  NotificationType,
  StoredNotification,
} from '../types/notification.types';

export interface INotificationRepository {
  /** Historique (D-66) : une ligne par destinataire, dans la langue de son appareil. */
  insert(entry: {
    userId: string;
    type: NotificationType;
    title: string;
    message: string;
    data: NotificationTarget | null;
  }): Promise<StoredNotification>;
}

const NOTIFICATION_COLUMNS = `id, user_id AS "userId", type, title, message, read, data,
  created_at AS "createdAt"`;

export class NotificationRepository implements INotificationRepository {
  constructor(private readonly db: Pool) {}

  async insert(entry: {
    userId: string;
    type: NotificationType;
    title: string;
    message: string;
    data: NotificationTarget | null;
  }): Promise<StoredNotification> {
    const result = await this.db.query<StoredNotification>(
      `INSERT INTO notifications (user_id, type, title, message, data)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING ${NOTIFICATION_COLUMNS}`,
      [entry.userId, entry.type, entry.title, entry.message, entry.data]
    );
    return result.rows[0];
  }
}
