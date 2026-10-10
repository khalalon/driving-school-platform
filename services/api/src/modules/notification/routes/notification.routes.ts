import { RequestHandler, Router } from 'express';
import { NotificationController } from '../controllers/notification.controller';

/**
 * §7 du contrat, montée sous `/api/notifications`. N1 et N2 sont ouvertes à **tout utilisateur
 * connecté** (élève, instructeur, admin) : un jeton push n'appartient qu'à son porteur.
 */
export function createNotificationRouter(
  controller: NotificationController,
  requireAuth: RequestHandler
): Router {
  const router = Router();

  router.put('/push-token', requireAuth, controller.registerPushToken);
  router.delete('/push-token', requireAuth, controller.removePushToken);

  return router;
}
