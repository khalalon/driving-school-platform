import { RequestHandler, Router } from 'express';
import { NotificationController } from '../controllers/notification.controller';

/**
 * §7 du contrat, montée sous `/api/notifications`. N1 à N5 sont ouvertes à **tout utilisateur
 * connecté** (élève, instructeur, admin) : un jeton push, comme une notification, n'appartient
 * qu'à son porteur.
 */
export function createNotificationRouter(
  controller: NotificationController,
  requireAuth: RequestHandler
): Router {
  const router = Router();

  router.put('/push-token', requireAuth, controller.registerPushToken);
  router.delete('/push-token', requireAuth, controller.removePushToken);

  // N3–N5 (17.6, D-66) : l'historique de l'appelant, et lui seul.
  router.get('/', requireAuth, controller.listMine);
  router.put('/read-all', requireAuth, controller.markAllRead);
  router.put('/:id/read', requireAuth, controller.markRead);

  return router;
}
