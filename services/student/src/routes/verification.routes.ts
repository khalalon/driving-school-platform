import { Router } from 'express';
import { VerificationService } from '../services/verification.service';
import { VerificationController } from '../controllers/verification.controller';
import { StudentRepository } from '../repositories/student.repository';
import { StatsRepository } from '../repositories/stats.repository';

const router = Router();

const studentRepo = new StudentRepository();
const statsRepo = new StatsRepository();
const verificationService = new VerificationService(studentRepo, statsRepo);
const verificationController = new VerificationController(verificationService);

// Public verification endpoints (used by other microservices)
router.get('/verify-enrollment', verificationController.verifyEnrollment);
router.get('/students/:studentId/eligibility', verificationController.checkEligibility);
router.post('/students/:studentId/lesson-completed', verificationController.recordLessonCompletion);

export default router;
