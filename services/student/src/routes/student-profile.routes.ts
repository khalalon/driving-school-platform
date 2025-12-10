/**
 * Student Self-Profile Routes
 * Single Responsibility: Student viewing their own profile
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
 * Student Self-Profile Routes (Students viewing their own data)
 */

// Get my profile
router.get(
  '/me/schools/:schoolId/profile',
  auth.authenticate,
  auth.authorize('student'),
  profileController.getMyProfile
);

// Get my lessons
router.get(
  '/me/schools/:schoolId/lessons',
  auth.authenticate,
  auth.authorize('student'),
  profileController.getMyLessons
);

// Get my exams
router.get(
  '/me/schools/:schoolId/exams',
  auth.authenticate,
  auth.authorize('student'),
  profileController.getMyExams
);

// Get my financial summary
router.get(
  '/me/schools/:schoolId/financial',
  auth.authenticate,
  auth.authorize('student'),
  profileController.getMyFinancialSummary
);

export default router;
