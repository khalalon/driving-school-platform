import { Router } from 'express';
import { AnalyticsController } from '../controllers/analytics.controller';
import { authMiddleware, adminOnly } from '../middleware/auth.middleware';

export const createAnalyticsRoutes = (controller: AnalyticsController): Router => {
  const router = Router();

  // All routes require authentication
  router.use(authMiddleware);

  // Revenue reports
  router.get('/revenue', controller.getRevenueReport);

  // Lesson statistics
  router.get('/lessons', controller.getLessonStats);

  // Exam statistics
  router.get('/exams', controller.getExamStats);

  // Student engagement
  router.get('/students/engagement', controller.getStudentEngagement);

  // Instructor performance
  router.get('/instructors/performance', controller.getInstructorPerformance);

  // Dashboard summary (admin only)
  router.get('/dashboard', adminOnly, controller.getDashboardSummary);

  return router;
};
