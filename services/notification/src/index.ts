import dotenv from 'dotenv';
import { DatabaseConfig } from './config/database.config';
import { RedisConfig } from './config/redis.config';
import { NotificationRepository } from './repositories/notification.repository';
import { PreferenceRepository } from './repositories/preference.repository';
import { PushTokenRepository } from './repositories/push-token.repository';
import { MockPushService, ExpoPushService } from './services/push.service';
import { MockEmailService } from './services/email.service';
import { MockSmsService } from './services/sms.service';
import { NotificationService } from './services/notification.service';
import { PreferenceService } from './services/preference.service';
import { PushTokenService } from './services/push-token.service';
import { NotificationController } from './controllers/notification.controller';
import { AuthMiddleware } from './middleware/auth.middleware';
import { NotificationRoutes } from './routes/notification.routes';
import { App } from './app';

dotenv.config();

async function bootstrap(): Promise<void> {
  try {
    const port = process.env.PORT || 3006;

    const db = DatabaseConfig.getInstance();
    await RedisConfig.getInstance();

    const notificationRepository = new NotificationRepository(db);
    const preferenceRepository = new PreferenceRepository(db);
    const pushTokenRepository = new PushTokenRepository(db);

    // Use Expo service if token is configured, otherwise use mock
    const pushService = process.env.EXPO_ACCESS_TOKEN
      ? new ExpoPushService()
      : new MockPushService();
    const emailService = new MockEmailService();
    const smsService = new MockSmsService();

    const notificationService = new NotificationService(
      notificationRepository,
      preferenceRepository,
      pushTokenRepository,
      pushService,
      emailService,
      smsService
    );
    const preferenceService = new PreferenceService(preferenceRepository);
    const pushTokenService = new PushTokenService(pushTokenRepository);

    const notificationController = new NotificationController(
      notificationService,
      preferenceService,
      pushTokenService
    );
    const authMiddleware = new AuthMiddleware();

    const notificationRoutes = new NotificationRoutes(notificationController, authMiddleware);

    const app = new App(notificationRoutes);

    app.getApp().listen(port, () => {
      console.log(`✅ Notification service running on port ${port}`);
    });
  } catch (error) {
    console.error('❌ Failed to start notification service:', error);
    process.exit(1);
  }
}

bootstrap().catch((error) => {
  console.error('Fatal error during bootstrap:', error);
  process.exit(1);
});
