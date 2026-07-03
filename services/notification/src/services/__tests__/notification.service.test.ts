import { NotificationService } from '../notification.service';
import { INotificationRepository } from '../../repositories/notification.repository';
import { IEmailService } from '../email.service';
import { IPushService } from '../push.service';
import { ISmsService } from '../sms.service';
import { Notification, CreateNotificationDTO, NotificationType } from '../../types';

describe('NotificationService', () => {
  let notificationService: NotificationService;
  let mockNotificationRepository: jest.Mocked<INotificationRepository>;
  let mockEmailService: jest.Mocked<IEmailService>;
  let mockPushService: jest.Mocked<IPushService>;
  let mockSmsService: jest.Mocked<ISmsService>;

  const mockNotification: Notification = {
    id: 'notification-123',
    userId: 'user-123',
    title: 'Test Notification',
    message: 'This is a test notification',
    type: 'info' as NotificationType,
    status: 'sent',
    channels: ['email'],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    mockNotificationRepository = {
      findById: jest.fn(),
      findByUserId: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      markAsRead: jest.fn(),
      markAllAsRead: jest.fn(),
      delete: jest.fn(),
    };

    mockEmailService = {
      sendEmail: jest.fn(),
    };

    mockPushService = {
      sendPush: jest.fn(),
    };

    mockSmsService = {
      sendSms: jest.fn(),
    };

    notificationService = new NotificationService(
      mockNotificationRepository,
      mockEmailService,
      mockPushService,
      mockSmsService
    );
  });

  describe('sendNotification', () => {
    it('should send email notification', async () => {
      const createNotificationDto: CreateNotificationDTO = {
        userId: 'user-123',
        title: 'Test Notification',
        message: 'Test message',
        type: 'info',
        channels: ['email'],
        userEmail: 'test@example.com',
      };

      mockNotificationRepository.create.mockResolvedValue(mockNotification);
      mockEmailService.sendEmail.mockResolvedValue({ messageId: 'msg-123' });

      const result = await notificationService.sendNotification(createNotificationDto);

      expect(mockEmailService.sendEmail).toHaveBeenCalledWith(
        createNotificationDto.userEmail,
        createNotificationDto.title,
        createNotificationDto.message
      );
      expect(mockNotificationRepository.create).toHaveBeenCalled();
      expect(result).toEqual(mockNotification);
    });

    it('should send push notification', async () => {
      const createNotificationDto: CreateNotificationDTO = {
        userId: 'user-123',
        title: 'Test Notification',
        message: 'Test message',
        type: 'info',
        channels: ['push'],
        userPushToken: 'push-token-123',
      };

      mockNotificationRepository.create.mockResolvedValue(mockNotification);
      mockPushService.sendPush.mockResolvedValue({ success: true });

      const result = await notificationService.sendNotification(createNotificationDto);

      expect(mockPushService.sendPush).toHaveBeenCalledWith(
        createNotificationDto.userPushToken,
        createNotificationDto.title,
        createNotificationDto.message
      );
      expect(result).toEqual(mockNotification);
    });

    it('should send SMS notification', async () => {
      const createNotificationDto: CreateNotificationDTO = {
        userId: 'user-123',
        title: 'Test Notification',
        message: 'Test message',
        type: 'info',
        channels: ['sms'],
        userPhone: '+1234567890',
      };

      mockNotificationRepository.create.mockResolvedValue(mockNotification);
      mockSmsService.sendSms.mockResolvedValue({ messageId: 'sms-123' });

      const result = await notificationService.sendNotification(createNotificationDto);

      expect(mockSmsService.sendSms).toHaveBeenCalledWith(
        createNotificationDto.userPhone,
        createNotificationDto.message
      );
      expect(result).toEqual(mockNotification);
    });

    it('should send notification via multiple channels', async () => {
      const createNotificationDto: CreateNotificationDTO = {
        userId: 'user-123',
        title: 'Test Notification',
        message: 'Test message',
        type: 'info',
        channels: ['email', 'push', 'sms'],
        userEmail: 'test@example.com',
        userPushToken: 'push-token-123',
        userPhone: '+1234567890',
      };

      mockNotificationRepository.create.mockResolvedValue(mockNotification);
      mockEmailService.sendEmail.mockResolvedValue({ messageId: 'msg-123' });
      mockPushService.sendPush.mockResolvedValue({ success: true });
      mockSmsService.sendSms.mockResolvedValue({ messageId: 'sms-123' });

      const result = await notificationService.sendNotification(createNotificationDto);

      expect(mockEmailService.sendEmail).toHaveBeenCalled();
      expect(mockPushService.sendPush).toHaveBeenCalled();
      expect(mockSmsService.sendSms).toHaveBeenCalled();
      expect(result).toEqual(mockNotification);
    });

    it('should handle notification errors gracefully', async () => {
      const createNotificationDto: CreateNotificationDTO = {
        userId: 'user-123',
        title: 'Test Notification',
        message: 'Test message',
        type: 'info',
        channels: ['email'],
        userEmail: 'test@example.com',
      };

      mockEmailService.sendEmail.mockRejectedValue(new Error('Email service error'));
      mockNotificationRepository.create.mockResolvedValue({
        ...mockNotification,
        status: 'failed',
      });

      const result = await notificationService.sendNotification(createNotificationDto);

      expect(result.status).toBe('failed');
    });
  });

  describe('getUserNotifications', () => {
    it('should return user notifications', async () => {
      const mockNotifications = [mockNotification];
      mockNotificationRepository.findByUserId.mockResolvedValue(mockNotifications);

      const result = await notificationService.getUserNotifications('user-123');

      expect(mockNotificationRepository.findByUserId).toHaveBeenCalledWith('user-123');
      expect(result).toEqual(mockNotifications);
    });

    it('should return empty array if no notifications', async () => {
      mockNotificationRepository.findByUserId.mockResolvedValue([]);

      const result = await notificationService.getUserNotifications('user-123');

      expect(result).toEqual([]);
    });
  });

  describe('markNotificationAsRead', () => {
    it('should mark notification as read', async () => {
      mockNotificationRepository.findById.mockResolvedValue(mockNotification);
      mockNotificationRepository.markAsRead.mockResolvedValue({
        ...mockNotification,
        read: true,
        readAt: new Date(),
      });

      const result = await notificationService.markNotificationAsRead('notification-123');

      expect(mockNotificationRepository.markAsRead).toHaveBeenCalledWith('notification-123');
      expect(result.read).toBe(true);
    });

    it('should throw error for non-existent notification', async () => {
      mockNotificationRepository.findById.mockResolvedValue(null);

      await expect(notificationService.markNotificationAsRead('non-existent'))
        .rejects.toThrow('Notification not found');
    });
  });

  describe('markAllNotificationsAsRead', () => {
    it('should mark all user notifications as read', async () => {
      mockNotificationRepository.markAllAsRead.mockResolvedValue([
        { ...mockNotification, read: true },
      ]);

      await notificationService.markAllNotificationsAsRead('user-123');

      expect(mockNotificationRepository.markAllAsRead).toHaveBeenCalledWith('user-123');
    });
  });

  describe('deleteNotification', () => {
    it('should delete a notification', async () => {
      mockNotificationRepository.findById.mockResolvedValue(mockNotification);
      mockNotificationRepository.delete.mockResolvedValue(undefined);

      await notificationService.deleteNotification('notification-123');

      expect(mockNotificationRepository.delete).toHaveBeenCalledWith('notification-123');
    });

    it('should throw error for non-existent notification', async () => {
      mockNotificationRepository.findById.mockResolvedValue(null);

      await expect(notificationService.deleteNotification('non-existent'))
        .rejects.toThrow('Notification not found');
    });
  });

  describe('sendBulkNotifications', () => {
    it('should send notifications to multiple users', async () => {
      const recipients = [
        { userId: 'user-1', email: 'user1@example.com' },
        { userId: 'user-2', email: 'user2@example.com' },
      ];

      mockNotificationRepository.create.mockResolvedValue(mockNotification);
      mockEmailService.sendEmail.mockResolvedValue({ messageId: 'msg-123' });

      await notificationService.sendBulkNotifications({
        title: 'Bulk Notification',
        message: 'This is a bulk notification',
        type: 'info',
        channels: ['email'],
        recipients,
      });

      expect(mockEmailService.sendEmail).toHaveBeenCalledTimes(2);
      expect(mockNotificationRepository.create).toHaveBeenCalledTimes(2);
    });
  });
});
