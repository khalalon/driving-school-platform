import { RequestHandler, Router } from 'express';
import { Pool } from 'pg';
import { NotificationController } from './controllers/notification.controller';
import { NotificationRepository } from './repositories/notification.repository';
import { PushTokenRepository } from './repositories/push-token.repository';
import { createNotificationRouter } from './routes/notification.routes';
import { EventNotifier, SchoolInstructorsLookup } from './services/event-notifier';
import { ExpoPushSender } from './services/expo-push-sender';
import { NotificationDispatcher } from './services/notification-dispatcher';
import { NotificationService } from './services/notification.service';
import { IPushSender, LogPushSender } from './services/push-sender';
import { SchoolNotifier } from './types/notification.types';

export interface NotificationModuleDeps {
  db: Pool;
  requireAuth: RequestHandler;
  /** `NOTIFICATIONS_DRIVER` (D-63) : `log` par défaut, `expo` en production. */
  driver: 'log' | 'expo';
  /** `InstructorRepository` partagé : les destinataires côté école (D-64). */
  instructors: SchoolInstructorsLookup;
}

export interface NotificationModule {
  router: Router;
  notificationService: NotificationService;
  /**
   * Injecté dans les services métier en 17.4 : `notify` n'échoue jamais, l'action qui vient de
   * réussir ne doit pas être annulée par un push tombé.
   */
  notifier: SchoolNotifier;
}

export function buildNotificationModule({
  db,
  requireAuth,
  driver,
  instructors,
}: NotificationModuleDeps): NotificationModule {
  const pushTokenRepository = new PushTokenRepository(db);
  const notificationService = new NotificationService(pushTokenRepository);
  const sender: IPushSender = driver === 'expo' ? new ExpoPushSender() : new LogPushSender();
  const dispatcher = new NotificationDispatcher(
    pushTokenRepository,
    new NotificationRepository(db),
    sender
  );
  const notifier = new EventNotifier(dispatcher, instructors);

  return {
    router: createNotificationRouter(new NotificationController(notificationService), requireAuth),
    notificationService,
    notifier,
  };
}
