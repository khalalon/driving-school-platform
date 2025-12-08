import { Router } from 'express';
import { ExamController } from '../controllers/exam.controller';
import { RegistrationController } from '../controllers/registration.controller';
import { AuthMiddleware } from '../middleware/auth.middleware';

export class ExamRoutes {
  constructor(
    private readonly examController: ExamController,
    private readonly registrationController: RegistrationController,
    private readonly authMiddleware: AuthMiddleware
  ) {}

  createRouter(): Router {
    const router = Router();

    // Exam routes
    router.post(
      '/',
      this.authMiddleware.authenticate,
      this.authMiddleware.authorize('admin'),
      this.examController.createExam
    );
    router.get('/', this.examController.getExams);
    router.get('/:id', this.examController.getExam);
    router.get('/:id/availability', this.examController.checkAvailability);
    router.put(
      '/:id',
      this.authMiddleware.authenticate,
      this.authMiddleware.authorize('admin'),
      this.examController.updateExam
    );
    router.delete(
      '/:id',
      this.authMiddleware.authenticate,
      this.authMiddleware.authorize('admin'),
      this.examController.deleteExam
    );

    // Registration routes
    router.post(
      '/:examId/register',
      this.authMiddleware.authenticate,
      this.authMiddleware.authorize('student', 'admin'),
      this.registrationController.registerForExam
    );
    router.get('/registrations/:id', this.registrationController.getRegistration);
    router.get('/:examId/registrations', this.registrationController.getRegistrationsByExam);
    router.get(
      '/students/:studentId/registrations',
      this.authMiddleware.authenticate,
      this.registrationController.getRegistrationsByStudent
    );
    router.get(
      '/students/:studentId/eligibility',
      this.authMiddleware.authenticate,
      this.registrationController.checkEligibility
    );
    router.put(
      '/registrations/:registrationId/result',
      this.authMiddleware.authenticate,
      this.authMiddleware.authorize('admin'),
      this.registrationController.recordResult
    );
    router.delete(
      '/registrations/:registrationId',
      this.authMiddleware.authenticate,
      this.registrationController.cancelRegistration
    );

    return router;
  }
}
