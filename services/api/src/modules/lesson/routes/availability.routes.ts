import { RequestHandler, Router } from 'express';
import { authorize } from '../../../middleware/auth.middleware';
import { UserRole } from '../../../types/auth';
import { AvailabilityController } from '../controllers/availability.controller';

/** I1–I2 du contrat (§10), montées sous `/api/instructors` : instructeur seulement. */
export function createAvailabilityRouter(
  controller: AvailabilityController,
  requireAuth: RequestHandler
): Router {
  const router = Router();
  const instructorOnly = [requireAuth, authorize(UserRole.INSTRUCTOR)];

  router.get('/me/availability', ...instructorOnly, controller.getMine);
  router.put('/me/availability', ...instructorOnly, controller.replaceMine);

  return router;
}
