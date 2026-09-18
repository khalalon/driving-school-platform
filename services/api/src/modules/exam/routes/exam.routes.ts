import { RequestHandler, Router } from 'express';
import { authorize } from '../../../middleware/auth.middleware';
import { UserRole } from '../../../types/auth';
import { ExamController } from '../controllers/exam.controller';

/**
 * Anciennes routes de sessions (admin), conservées jusqu'à X1–X5 (5.5–5.6). Les routes
 * d'inscription et d'éligibilité ont disparu avec la table exam_registrations (3.4, D-26).
 */
export function createExamRouter(controller: ExamController, requireAuth: RequestHandler): Router {
  const router = Router();
  const adminOnly = [requireAuth, authorize(UserRole.ADMIN)];

  router.post('/', ...adminOnly, controller.createExam);
  router.get('/', controller.getExams);
  router.get('/:id', controller.getExam);
  router.put('/:id', ...adminOnly, controller.updateExam);
  router.delete('/:id', ...adminOnly, controller.deleteExam);

  return router;
}
