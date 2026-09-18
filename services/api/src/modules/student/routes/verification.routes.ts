import { Router } from 'express';
import { VerificationController } from '../controllers/verification.controller';

/** Publiques (état actuel) ; non exposées par Nginx à partir de 2.6, retirées en 5.7. Éligibilité retirée en 3.4 (D-26). */
export function createVerificationRouter(controller: VerificationController): Router {
  const router = Router();

  router.get('/verify-enrollment', controller.verifyEnrollment);
  router.post('/students/:studentId/lesson-completed', controller.recordLessonCompletion);

  return router;
}
