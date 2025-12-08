import { INotificationRepository } from '../repositories/notification.repository';
import { IPreferenceRepository } from '../repositories/preference.repository';
import { IPushTokenRepository } from '../repositories/push-token.repository';
import { IPushService } from './push.service';
import { IEmailService } from './email.service';
import { ISmsService } from './sms.service';
import {
  Notification,
  CreateNotificationDTO,
  SendBulkNotificationDTO,
  NotificationFilters,
  NotificationChannel,
} from '../types';

export class NotificationService {
  constructor(
    private readonly notificationRepository: INotificationRepository,
    private readonly preferenceRepository: IPreferenceRepository,
    private readonly pushTokenRepository: IPushTokenRepository,
    private readonly pushService: IPushService,
    private readonly emailService: IEmailService,
    private readonly smsService: ISmsService
  ) {}

  async sendNotification(dto: CreateNotificationDTO): Promise<Notification> {
    // Create in-app notification
    const notification = await this.notificationRepository.create({
      ...dto,
      channel: NotificationChannel.IN_APP,
    });

    // Get user preferences
    const preference = await this.preferenceRepository.findByUserAndType(dto.userId, dto.type);

    // Send via enabled channels
    if (preference?.pushEnabled) {
      await this.sendPush(dto.userId, dto.title, dto.message, dto.metadata);
    }

    // Email and SMS would be sent based on preferences
    // For now, we'll skip them to keep it simple

    return notification;
  }

  async sendBulkNotification(dto: SendBulkNotificationDTO): Promise<void> {
    const promises = dto.userIds.map((userId) =>
      this.sendNotification({
        userId,
        type: dto.type,
        title: dto.title,
        message: dto.message,
        metadata: dto.metadata,
      })
    );

    await Promise.allSettled(promises);
  }

  private async sendPush(
    userId: string,
    title: string,
    message: string,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    const tokens = await this.pushTokenRepository.findByUserId(userId);
    if (tokens.length === 0) return;

    const tokenStrings = tokens.map((t) => t.token);
    await this.pushService.sendPushNotification(tokenStrings, title, message, metadata);
  }

  async getNotifications(filters: NotificationFilters): Promise<Notification[]> {
    return this.notificationRepository.findAll(filters);
  }

  async getNotificationById(id: string): Promise<Notification> {
    const notification = await this.notificationRepository.findById(id);
    if (!notification) {
      throw new Error('Notification not found');
    }
    return notification;
  }

  async markAsRead(id: string): Promise<Notification> {
    const notification = await this.notificationRepository.findById(id);
    if (!notification) {
      throw new Error('Notification not found');
    }
    return this.notificationRepository.markAsRead(id);
  }

  async markAllAsRead(userId: string): Promise<void> {
    await this.notificationRepository.markAllAsRead(userId);
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.notificationRepository.getUnreadCount(userId);
  }

  async deleteNotification(id: string): Promise<void> {
    const notification = await this.notificationRepository.findById(id);
    if (!notification) {
      throw new Error('Notification not found');
    }
    await this.notificationRepository.delete(id);
  }
}
