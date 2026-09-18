import { RequestHandler, Router } from 'express';
import { authorize } from '../../../middleware/auth.middleware';
import { UserRole } from '../../../types/auth';
import { ExamController } from '../controllers/exam.controller';

/** Mêmes chemins que l'ancien exam-service (2.4 : « tels quels »). Refonte X1–X5 en 5.5–5.6. */
export function createExamRouter(controller: ExamController, requireAuth: RequestHandler): Router {
  const router = Router();
  const adminOnly = [requireAuth, authorize(UserRole.ADMIN)];

  router.post('/', ...adminOnly, controller.createExam);
  router.get('/', controller.getExams);

  // Sous-ressources déclarées avant `/:id`.
  router.get('/registrations/:id', controller.getRegistration);
  router.put('/registrations/:registrationId/result', ...adminOnly, controller.recordResult);
  router.delete('/registrations/:registrationId', requireAuth, controller.cancelRegistration);
  router.get(
    '/students/:studentId/registrations',
    requireAuth,
    controller.getRegistrationsByStudent
  );
  router.get('/students/:studentId/eligibility', requireAuth, controller.checkEligibility);

  router.get('/:id', controller.getExam);
  router.get('/:id/availability', controller.checkAvailability);
  router.put('/:id', ...adminOnly, controller.updateExam);
  router.delete('/:id', ...adminOnly, controller.deleteExam);

  router.post(
    '/:examId/register',
    requireAuth,
    authorize(UserRole.STUDENT, UserRole.ADMIN),
    controller.registerForExam
  );
  router.get('/:examId/registrations', controller.getRegistrationsByExam);

  return router;
}
