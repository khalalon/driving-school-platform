import { Router } from 'express';
import { EnrollmentService } from '../services/enrollment.service';
import { EnrollmentController } from '../controllers/enrollment.controller';
import { EnrollmentRepository } from '../repositories/enrollment.repository';
import { StudentRepository } from '../repositories/student.repository';
import { AuthMiddleware } from '../middleware/auth.middleware';

const router = Router();
const auth = new AuthMiddleware();

const enrollmentRepo = new EnrollmentRepository();
const studentRepo = new StudentRepository();
const enrollmentService = new EnrollmentService(enrollmentRepo, studentRepo);
const enrollmentController = new EnrollmentController(enrollmentService);

// Student routes
router.get(
  '/my-requests',
  auth.authenticate,
  auth.authorize('student'),
  enrollmentController.getMyRequests
);

router.post(
  '/schools/:schoolId/request',
  auth.authenticate,
  auth.authorize('student'),
  enrollmentController.requestEnrollment
);

router.get(
  '/schools/:schoolId/status',
  auth.authenticate,
  auth.authorize('student'),
  enrollmentController.checkEnrollmentStatus
);

// Instructor/Admin routes
router.get(
  '/schools/:schoolId/requests',
  auth.authenticate,
  auth.authorize('instructor', 'admin'),
  enrollmentController.getSchoolRequests
);

router.put(
  '/:requestId/approve',
  auth.authenticate,
  auth.authorize('instructor', 'admin'),
  enrollmentController.approveRequest
);

router.put(
  '/:requestId/reject',
  auth.authenticate,
  auth.authorize('instructor', 'admin'),
  enrollmentController.rejectRequest
);

export default router;
