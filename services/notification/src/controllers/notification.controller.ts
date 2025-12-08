import { Request, Response } from 'express';
import { NotificationService } from '../services/notification.service';
import { PreferenceService } from '../services/preference.service';
import { PushTokenService } from '../services/push-token.service';
import {
  sendNotificationSchema,
  sendBulkNotificationSchema,
  updatePreferencesSchema,
  registerPushTokenSchema,
  notificationFiltersSchema,
} from '../validators/notification.validator';
import { AuthRequest } from '../middleware/auth.middleware';

export class NotificationController {
  constructor(
    private readonly notificationService: NotificationService,
    private readonly preferenceService: PreferenceService,
    private readonly pushTokenService: PushTokenService
  ) {}

  sendNotification = async (req: Request, res: Response): Promise<void> => {
    try {
      const { error, value } = sendNotificationSchema.validate(req.body);
      if (error) {
        res.status(400).json({ error: error.details[0].message });
        return;
      }

      const notification = await this.notificationService.sendNotification(value);
      res.status(201).json(notification);
    } catch (err) {
      const error = err as Error;
      res.status(400).json({ error: error.message });
    }
  };

  sendBulkNotification = async (req: Request, res: Response): Promise<void> => {
    try {
      const { error, value } = sendBulkNotificationSchema.validate(req.body);
      if (error) {
        res.status(400).json({ error: error.details[0].message });
        return;
      }

      await this.notificationService.sendBulkNotification(value);
      res.status(202).json({ message: 'Bulk notifications queued' });
    } catch (err) {
      const error = err as Error;
      res.status(400).json({ error: error.message });
    }
  };

  getNotifications = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { error, value } = notificationFiltersSchema.validate(req.query);
      if (error) {
        res.status(400).json({ error: error.details[0].message });
        return;
      }

      // Users can only see their own notifications
      if (req.user.role !== 'admin') {
        value.userId = req.user.userId;
      }

      const notifications = await this.notificationService.getNotifications(value);
      res.status(200).json(notifications);
    } catch (err) {
      const error = err as Error;
      res.status(400).json({ error: error.message });
    }
  };

  getNotification = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const notification = await this.notificationService.getNotificationById(id);
      res.status(200).json(notification);
    } catch (err) {
      const error = err as Error;
      res.status(404).json({ error: error.message });
    }
  };

  markAsRead = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const notification = await this.notificationService.markAsRead(id);
      res.status(200).json(notification);
    } catch (err) {
      const error = err as Error;
      res.status(400).json({ error: error.message });
    }
  };

  markAllAsRead = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      await this.notificationService.markAllAsRead(req.user.userId);
      res.status(200).json({ message: 'All notifications marked as read' });
    } catch (err) {
      const error = err as Error;
      res.status(400).json({ error: error.message });
    }
  };

  getUnreadCount = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const count = await this.notificationService.getUnreadCount(req.user.userId);
      res.status(200).json({ count });
    } catch (err) {
      const error = err as Error;
      res.status(400).json({ error: error.message });
    }
  };

  deleteNotification = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      await this.notificationService.deleteNotification(id);
      res.status(200).json({ message: 'Notification deleted successfully' });
    } catch (err) {
      const error = err as Error;
      res.status(400).json({ error: error.message });
    }
  };

  getPreferences = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const preferences = await this.preferenceService.getPreferences(req.user.userId);
      res.status(200).json(preferences);
    } catch (err) {
      const error = err as Error;
      res.status(400).json({ error: error.message });
    }
  };

  updatePreferences = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { error, value } = updatePreferencesSchema.validate(req.body);
      if (error) {
        res.status(400).json({ error: error.details[0].message });
        return;
      }

      const preference = await this.preferenceService.updatePreferences(req.user.userId, value);
      res.status(200).json(preference);
    } catch (err) {
      const error = err as Error;
      res.status(400).json({ error: error.message });
    }
  };

  registerPushToken = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { error, value } = registerPushTokenSchema.validate(req.body);
      if (error) {
        res.status(400).json({ error: error.details[0].message });
        return;
      }

      const token = await this.pushTokenService.registerToken(
        req.user.userId,
        value.token,
        value.platform
      );
      res.status(201).json(token);
    } catch (err) {
      const error = err as Error;
      res.status(400).json({ error: error.message });
    }
  };

  deletePushToken = async (req: Request, res: Response): Promise<void> => {
    try {
      const { token } = req.params;
      await this.pushTokenService.deleteToken(token);
      res.status(200).json({ message: 'Push token deleted successfully' });
    } catch (err) {
      const error = err as Error;
      res.status(400).json({ error: error.message });
    }
  };
}
