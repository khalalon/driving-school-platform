import { RequestHandler, Router } from 'express';
import { authorize } from '../../../middleware/auth.middleware';
import { UserRole } from '../../../types/auth';
import { EnrollmentController } from '../controllers/enrollment.controller';

/** E1–E6 du contrat, montées sur `/api/enrollment`. */
export function createEnrollmentRouter(
  controller: EnrollmentController,
  requireAuth: RequestHandler
): Router {
  const router = Router();
  const studentOnly = [requireAuth, authorize(UserRole.STUDENT)];
  const schoolStaff = [requireAuth, authorize(UserRole.INSTRUCTOR, UserRole.ADMIN)];

  router.get('/my-requests', ...studentOnly, controller.getMyRequests);
  router.post('/schools/:schoolId/request', ...studentOnly, controller.requestEnrollment);
  router.get('/schools/:schoolId/status', ...studentOnly, controller.checkEnrollmentStatus);

  router.get('/schools/:schoolId/requests', ...schoolStaff, controller.getSchoolRequests);
  router.put('/:requestId/approve', ...schoolStaff, controller.approveRequest);
  router.put('/:requestId/reject', ...schoolStaff, controller.rejectRequest);

  return router;
}
