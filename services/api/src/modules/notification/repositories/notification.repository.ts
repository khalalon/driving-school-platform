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
  /** N3 : les plus récentes d'abord, bornées à `limit`, éventuellement les seules non lues. */
  findByUser(userId: string, unreadOnly: boolean, limit: number): Promise<StoredNotification[]>;
  /** N4 : `false` si la notification n'existe pas **ou n'est pas à ce compte**. */
  markRead(userId: string, id: string): Promise<boolean>;
  /** N5 : toutes les non lues du compte ; renvoie leur nombre. */
  markAllRead(userId: string): Promise<number>;
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

  async findByUser(
    userId: string,
    unreadOnly: boolean,
    limit: number
  ): Promise<StoredNotification[]> {
    const result = await this.db.query<StoredNotification>(
      `SELECT ${NOTIFICATION_COLUMNS} FROM notifications
       WHERE user_id = $1 AND ($2::boolean = FALSE OR read = FALSE)
       ORDER BY created_at DESC
       LIMIT $3`,
      [userId, unreadOnly, limit]
    );
    return result.rows;
  }

  async markRead(userId: string, id: string): Promise<boolean> {
    // Le compte fait partie du filtre : marquer la notification d'un autre ne trouve rien.
    const result = await this.db.query(
      `UPDATE notifications SET read = TRUE WHERE id = $1 AND user_id = $2 RETURNING id`,
      [id, userId]
    );
    return result.rows.length > 0;
  }

  async markAllRead(userId: string): Promise<number> {
    const result = await this.db.query(
      `UPDATE notifications SET read = TRUE WHERE user_id = $1 AND read = FALSE`,
      [userId]
    );
    return result.rowCount ?? 0;
  }
}
