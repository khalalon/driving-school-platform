import { Router } from 'express';
import { NotificationController } from '../controllers/notification.controller';
import { AuthMiddleware } from '../middleware/auth.middleware';

export class NotificationRoutes {
  constructor(
    private readonly notificationController: NotificationController,
    private readonly authMiddleware: AuthMiddleware
  ) {}

  createRouter(): Router {
    const router = Router();

    // Send notifications (admin only)
    router.post(
      '/send',
      this.authMiddleware.authenticate,
      this.authMiddleware.authorize('admin'),
      this.notificationController.sendNotification
    );

    router.post(
      '/send-bulk',
      this.authMiddleware.authenticate,
      this.authMiddleware.authorize('admin'),
      this.notificationController.sendBulkNotification
    );

    // Get notifications
    router.get('/', this.authMiddleware.authenticate, this.notificationController.getNotifications);

    router.get(
      '/unread-count',
      this.authMiddleware.authenticate,
      this.notificationController.getUnreadCount
    );

    router.get(
      '/:id',
      this.authMiddleware.authenticate,
      this.notificationController.getNotification
    );

    // Mark as read
    router.put(
      '/:id/read',
      this.authMiddleware.authenticate,
      this.notificationController.markAsRead
    );

    router.put(
      '/read-all',
      this.authMiddleware.authenticate,
      this.notificationController.markAllAsRead
    );

    // Delete notification
    router.delete(
      '/:id',
      this.authMiddleware.authenticate,
      this.notificationController.deleteNotification
    );

    // Preferences
    router.get(
      '/preferences/me',
      this.authMiddleware.authenticate,
      this.notificationController.getPreferences
    );

    router.put(
      '/preferences',
      this.authMiddleware.authenticate,
      this.notificationController.updatePreferences
    );

    // Push tokens
    router.post(
      '/push-tokens',
      this.authMiddleware.authenticate,
      this.notificationController.registerPushToken
    );

    router.delete('/push-tokens/:token', this.notificationController.deletePushToken);

    return router;
  }
}
