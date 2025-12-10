/**
 * Profile Routes
 * Single Responsibility: Define student profile routes
 */

import { Router } from 'express';
import { ProfileService } from '../services/profile.service';
import { ProfileController } from '../controllers/profile.controller';
import { ProfileRepository } from '../repositories/profile.repository';
import { AuthMiddleware } from '../middleware/auth.middleware';

const router = Router();
const auth = new AuthMiddleware();

// Repositories
const profileRepo = new ProfileRepository();

// Service
const profileService = new ProfileService(profileRepo);

// Controller
const profileController = new ProfileController(profileService);

/**
 * Student Profile Routes (Instructor/Admin only)
 */

// Get complete student profile (fiche client)
router.get(
  '/:studentId/schools/:schoolId/complete',
  auth.authenticate,
  auth.authorize('instructor', 'admin'),
  profileController.getCompleteProfile
);

// Get student's lesson history
router.get(
  '/:studentId/schools/:schoolId/lessons',
  auth.authenticate,
  auth.authorize('instructor', 'admin'),
  profileController.getStudentLessons
);

// Get student's exam history
router.get(
  '/:studentId/schools/:schoolId/exams',
  auth.authenticate,
  auth.authorize('instructor', 'admin'),
  profileController.getStudentExams
);

// Get student's financial summary
router.get(
  '/:studentId/schools/:schoolId/financial',
  auth.authenticate,
  auth.authorize('instructor', 'admin'),
  profileController.getFinancialSummary
);

// Update instructor notes about student
router.put(
  '/:studentId/notes',
  auth.authenticate,
  auth.authorize('instructor', 'admin'),
  profileController.updateNotes
);

/**
 * Payment Management Routes (Instructor/Admin only)
 */

// Mark lesson booking as paid
router.put(
  '/bookings/:bookingId/mark-paid',
  auth.authenticate,
  auth.authorize('instructor', 'admin'),
  profileController.markLessonPaid
);

// Mark exam registration as paid
router.put(
  '/registrations/:registrationId/mark-paid',
  auth.authenticate,
  auth.authorize('instructor', 'admin'),
  profileController.markExamPaid
);

export default router;