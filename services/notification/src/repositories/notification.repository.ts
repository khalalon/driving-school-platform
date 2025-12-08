import { Pool } from 'pg';
import {
  Notification,
  CreateNotificationDTO,
  NotificationFilters,
  NotificationChannel,
} from '../types';

export interface INotificationRepository {
  create(dto: CreateNotificationDTO): Promise<Notification>;
  findById(id: string): Promise<Notification | null>;
  findAll(filters: NotificationFilters): Promise<Notification[]>;
  markAsRead(id: string): Promise<Notification>;
  markAllAsRead(userId: string): Promise<void>;
  delete(id: string): Promise<void>;
  getUnreadCount(userId: string): Promise<number>;
}

export class NotificationRepository implements INotificationRepository {
  constructor(private readonly db: Pool) {}

  async create(dto: CreateNotificationDTO): Promise<Notification> {
    const query = `
      INSERT INTO notifications (
        user_id, type, title, message, channel, metadata, created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
      RETURNING 
        id,
        user_id as "userId",
        type,
        title,
        message,
        channel,
        read,
        metadata,
        created_at as "createdAt"
    `;

    const result = await this.db.query(query, [
      dto.userId,
      dto.type,
      dto.title,
      dto.message,
      dto.channel || NotificationChannel.IN_APP,
      dto.metadata ? JSON.stringify(dto.metadata) : null,
    ]);

    return result.rows[0] as Notification;
  }

  async findById(id: string): Promise<Notification | null> {
    const query = `
      SELECT 
        id,
        user_id as "userId",
        type,
        title,
        message,
        channel,
        read,
        metadata,
        created_at as "createdAt"
      FROM notifications
      WHERE id = $1
    `;

    const result = await this.db.query(query, [id]);
    return result.rows[0] || null;
  }

  async findAll(filters: NotificationFilters): Promise<Notification[]> {
    const conditions: string[] = [];
    const values: unknown[] = [];
    let paramCount = 1;

    if (filters.userId) {
      conditions.push(`user_id = $${paramCount++}`);
      values.push(filters.userId);
    }
    if (filters.type) {
      conditions.push(`type = $${paramCount++}`);
      values.push(filters.type);
    }
    if (filters.read !== undefined) {
      conditions.push(`read = $${paramCount++}`);
      values.push(filters.read);
    }
    if (filters.dateFrom) {
      conditions.push(`created_at >= $${paramCount++}`);
      values.push(filters.dateFrom);
    }
    if (filters.dateTo) {
      conditions.push(`created_at <= $${paramCount++}`);
      values.push(filters.dateTo);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const query = `
      SELECT 
        id,
        user_id as "userId",
        type,
        title,
        message,
        channel,
        read,
        metadata,
        created_at as "createdAt"
      FROM notifications
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT 100
    `;

    const result = await this.db.query(query, values);
    return result.rows as Notification[];
  }

  async markAsRead(id: string): Promise<Notification> {
    const query = `
      UPDATE notifications
      SET read = true
      WHERE id = $1
      RETURNING 
        id,
        user_id as "userId",
        type,
        title,
        message,
        channel,
        read,
        metadata,
        created_at as "createdAt"
    `;

    const result = await this.db.query(query, [id]);
    return result.rows[0] as Notification;
  }

  async markAllAsRead(userId: string): Promise<void> {
    const query = 'UPDATE notifications SET read = true WHERE user_id = $1 AND read = false';
    await this.db.query(query, [userId]);
  }

  async delete(id: string): Promise<void> {
    const query = 'DELETE FROM notifications WHERE id = $1';
    await this.db.query(query, [id]);
  }

  async getUnreadCount(userId: string): Promise<number> {
    const query = 'SELECT COUNT(*) as count FROM notifications WHERE user_id = $1 AND read = false';
    const result = await this.db.query(query, [userId]);
    return parseInt(result.rows[0].count, 10);
  }
}
