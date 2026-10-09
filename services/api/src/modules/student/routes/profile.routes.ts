import { RequestHandler, Router } from 'express';
import { authorize } from '../../../middleware/auth.middleware';
import { UserRole } from '../../../types/auth';
import { ProfileController } from '../controllers/profile.controller';
import { StudentFileController } from '../controllers/student-file.controller';

/** P1–P7 et F5 / F7 (dossier administratif) : fiche élève vue par l'école, sur `/api/profiles`. */
export function createProfileRouter(
  controller: ProfileController,
  fileController: StudentFileController,
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

  // F5 / F7 (D-61) : dossier administratif de l'élève dans cette école, pièce par pièce.
  router.get('/:studentId/schools/:schoolId/file', ...schoolStaff, fileController.getStudentFile);
  router.put(
    '/:studentId/schools/:schoolId/documents/:documentTypeId',
    ...schoolStaff,
    fileController.setDocumentReceived
  );

  // P6 / P7 : le paiement est porté par la leçon et par l'examen (schémas 007 / 008).
  router.put('/lessons/:lessonId/mark-paid', ...schoolStaff, controller.markLessonPaid);
  router.put('/exams/:examId/mark-paid', ...schoolStaff, controller.markExamPaid);

  return router;
}

/** P8–P11 et F6 : l'élève consulte sa propre fiche, monté sur `/api/student-profiles`. */
export function createStudentProfileRouter(
  controller: ProfileController,
  fileController: StudentFileController,
  requireAuth: RequestHandler
): Router {
  const router = Router();
  const studentOnly = [requireAuth, authorize(UserRole.STUDENT)];

  router.get('/me/schools/:schoolId/profile', ...studentOnly, controller.getMyProfile);
  router.get('/me/schools/:schoolId/lessons', ...studentOnly, controller.getMyLessons);
  router.get('/me/schools/:schoolId/exams', ...studentOnly, controller.getMyExams);
  router.get('/me/schools/:schoolId/financial', ...studentOnly, controller.getMyFinancialSummary);
  // F6 : ce qu'il reste à apporter au bureau (D-61).
  router.get('/me/schools/:schoolId/file', ...studentOnly, fileController.getMyFile);

  return router;
}
