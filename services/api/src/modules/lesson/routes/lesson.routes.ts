import { RequestHandler, Router } from 'express';
import { authorize } from '../../../middleware/auth.middleware';
import { UserRole } from '../../../types/auth';
import { LessonController } from '../controllers/lesson.controller';

/** Mêmes chemins que l'ancien lesson-service (2.4 : « tels quels »). Refonte L1–L7 en 5.2–5.4. */
export function createLessonRouter(
  controller: LessonController,
  requireAuth: RequestHandler
): Router {
  const router = Router();
  const schoolStaff = [requireAuth, authorize(UserRole.ADMIN, UserRole.INSTRUCTOR)];
  const adminOnly = [requireAuth, authorize(UserRole.ADMIN)];

  router.post('/', ...schoolStaff, controller.createLesson);
  router.get('/', controller.getLessons);

  // Sous-ressources déclarées avant `/:id`.
  router.get('/bookings/:id', controller.getBooking);
  router.put('/bookings/:bookingId/attendance', ...schoolStaff, controller.markAttendance);
  router.delete('/bookings/:bookingId', requireAuth, controller.cancelBooking);
  router.get('/students/:studentId/bookings', requireAuth, controller.getBookingsByStudent);

  router.get('/:id', controller.getLesson);
  router.get('/:id/availability', controller.checkAvailability);
  router.put('/:id', ...schoolStaff, controller.updateLesson);
  router.post('/:id/cancel', ...schoolStaff, controller.cancelLesson);
  router.delete('/:id', ...adminOnly, controller.deleteLesson);

  router.post(
    '/:lessonId/book',
    requireAuth,
    authorize(UserRole.STUDENT, UserRole.ADMIN),
    controller.bookLesson
  );
  router.get('/:lessonId/bookings', controller.getBookingsByLesson);

  return router;
}
