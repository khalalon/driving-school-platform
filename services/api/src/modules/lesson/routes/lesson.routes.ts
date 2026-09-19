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

  router.post('/', requireAuth, authorize(UserRole.STUDENT), controller.requestLesson);
  router.get('/', requireAuth, controller.listLessons);
  router.get('/:id', requireAuth, controller.getLesson);

  return router;
}
