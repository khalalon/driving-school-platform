import { RequestHandler, Router } from 'express';
import { authorize } from '../../../middleware/auth.middleware';
import { UserRole } from '../../../types/auth';
import { LessonController } from '../controllers/lesson.controller';

/** L1–L7 du contrat (§4) ; `GET /:id` conservé (§8). Cloisonnement dans le service (D-20). */
export function createLessonRouter(
  controller: LessonController,
  requireAuth: RequestHandler
): Router {
  const router = Router();

  const schoolStaff = [requireAuth, authorize(UserRole.INSTRUCTOR, UserRole.ADMIN)];

  router.post('/', requireAuth, authorize(UserRole.STUDENT), controller.requestLesson);
  router.get('/', requireAuth, controller.listLessons);
  router.get('/:id', requireAuth, controller.getLesson);
  // L5 : un instructeur seulement — il devient l'instructeur de la leçon (D-32).
  router.put('/:id/approve', requireAuth, authorize(UserRole.INSTRUCTOR), controller.approveLesson);
  router.put('/:id/reject', ...schoolStaff, controller.rejectLesson);
  // L3 : élève (sa leçon, fenêtre D-24) ou école (D-20) — départagés dans le service.
  router.post('/:id/cancel', requireAuth, controller.cancelLesson);

  return router;
}
