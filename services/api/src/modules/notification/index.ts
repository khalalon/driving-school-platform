import { RequestHandler, Router } from 'express';
import { Pool } from 'pg';
import { NotificationController } from './controllers/notification.controller';
import { PushTokenRepository } from './repositories/push-token.repository';
import { createNotificationRouter } from './routes/notification.routes';
import { NotificationService } from './services/notification.service';

export interface NotificationModuleDeps {
  db: Pool;
  requireAuth: RequestHandler;
}

export interface NotificationModule {
  router: Router;
  notificationService: NotificationService;
  /** Réutilisé en 17.3 par l'envoyeur push : les jetons des destinataires d'un événement. */
  pushTokenRepository: PushTokenRepository;
}

export function buildNotificationModule({
  db,
  requireAuth,
}: NotificationModuleDeps): NotificationModule {
  const pushTokenRepository = new PushTokenRepository(db);
  const notificationService = new NotificationService(pushTokenRepository);

  return {
    router: createNotificationRouter(new NotificationController(notificationService), requireAuth),
    notificationService,
    pushTokenRepository,
  };
}
