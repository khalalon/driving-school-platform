import { Router } from 'express';
import { LessonController } from '../controllers/lesson.controller';
import { BookingController } from '../controllers/booking.controller';
import { AuthMiddleware } from '../middleware/auth.middleware';

export class LessonRoutes {
  constructor(
    private readonly lessonController: LessonController,
    private readonly bookingController: BookingController,
    private readonly authMiddleware: AuthMiddleware
  ) {}

  createRouter(): Router {
    const router = Router();

    router.post(
      '/',
      this.authMiddleware.authenticate,
      this.authMiddleware.authorize('admin', 'instructor'),
      this.lessonController.createLesson
    );
    router.get('/', this.lessonController.getLessons);
    router.get('/:id', this.lessonController.getLesson);
    router.get('/:id/availability', this.lessonController.checkAvailability);
    router.put(
      '/:id',
      this.authMiddleware.authenticate,
      this.authMiddleware.authorize('admin', 'instructor'),
      this.lessonController.updateLesson
    );
    router.post(
      '/:id/cancel',
      this.authMiddleware.authenticate,
      this.authMiddleware.authorize('admin', 'instructor'),
      this.lessonController.cancelLesson
    );
    router.delete(
      '/:id',
      this.authMiddleware.authenticate,
      this.authMiddleware.authorize('admin'),
      this.lessonController.deleteLesson
    );

    router.post(
      '/:lessonId/book',
      this.authMiddleware.authenticate,
      this.authMiddleware.authorize('student', 'admin'),
      this.bookingController.bookLesson
    );
    router.get('/bookings/:id', this.bookingController.getBooking);
    router.get('/:lessonId/bookings', this.bookingController.getBookingsByLesson);
    router.get(
      '/students/:studentId/bookings',
      this.authMiddleware.authenticate,
      this.bookingController.getBookingsByStudent
    );
    router.put(
      '/bookings/:bookingId/attendance',
      this.authMiddleware.authenticate,
      this.authMiddleware.authorize('instructor', 'admin'),
      this.bookingController.markAttendance
    );
    router.delete(
      '/bookings/:bookingId',
      this.authMiddleware.authenticate,
      this.bookingController.cancelBooking
    );

    return router;
  }
}
