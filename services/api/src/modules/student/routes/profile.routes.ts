import { RequestHandler, Router } from 'express';
import { authorize } from '../../../middleware/auth.middleware';
import { UserRole } from '../../../types/auth';
import { ProfileController } from '../controllers/profile.controller';

/** P1–P7 : fiche élève vue par l'école, montée sur `/api/profiles`. */
export function createProfileRouter(
  controller: ProfileController,
  requireAuth: RequestHandler
): Router {
  const router = Router();
  const schoolStaff = [requireAuth, authorize(UserRole.INSTRUCTOR, UserRole.ADMIN)];

  router.get(
    '/:studentId/schools/:schoolId/complete',
    ...schoolStaff,
    controller.getCompleteProfile
  );
  router.get('/:studentId/schools/:schoolId/lessons', ...schoolStaff, controller.getStudentLessons);
  router.get('/:studentId/schools/:schoolId/exams', ...schoolStaff, controller.getStudentExams);
  router.get(
    '/:studentId/schools/:schoolId/financial',
    ...schoolStaff,
    controller.getFinancialSummary
  );
  router.put('/:studentId/notes', ...schoolStaff, controller.updateNotes);

  // Chemins actuels ; renommés en `/lessons/:lessonId` et `/exams/:examId` en 5.0.
  router.put('/bookings/:bookingId/mark-paid', ...schoolStaff, controller.markLessonPaid);
  router.put('/registrations/:registrationId/mark-paid', ...schoolStaff, controller.markExamPaid);

  return router;
}

/** P8–P11 : l'élève consulte sa propre fiche, monté sur `/api/student-profiles`. */
export function createStudentProfileRouter(
  controller: ProfileController,
  requireAuth: RequestHandler
): Router {
  const router = Router();
  const studentOnly = [requireAuth, authorize(UserRole.STUDENT)];

  router.get('/me/schools/:schoolId/profile', ...studentOnly, controller.getMyProfile);
  router.get('/me/schools/:schoolId/lessons', ...studentOnly, controller.getMyLessons);
  router.get('/me/schools/:schoolId/exams', ...studentOnly, controller.getMyExams);
  router.get('/me/schools/:schoolId/financial', ...studentOnly, controller.getMyFinancialSummary);

  return router;
}
