import { RequestHandler, Router } from 'express';
import { authorize } from '../../../middleware/auth.middleware';
import { UserRole } from '../../../types/auth';
import { ExamController } from '../controllers/exam.controller';

/** X1–X5 du contrat (§5) ; `GET /:id` conservé (§8). Cloisonnement dans le service (D-20). */
export function createExamRouter(controller: ExamController, requireAuth: RequestHandler): Router {
  const router = Router();

  // Chemins fixes déclarés avant `/:id`.
  router.post('/request', requireAuth, authorize(UserRole.STUDENT), controller.requestExam);
  router.get('/my-exams', requireAuth, controller.listMyExams);
  router.get('/:id', requireAuth, controller.getExam);

  return router;
}
