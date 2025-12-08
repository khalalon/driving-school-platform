import { Router } from 'express';
import { SchoolService } from '../services/school.service';
import { InstructorService } from '../services/instructor.service';
import { PricingService } from '../services/pricing.service';
import { SchoolController } from '../controllers/school.controller';
import { InstructorController } from '../controllers/instructor.controller';
import { PricingController } from '../controllers/pricing.controller';
import { SchoolRepository } from '../repositories/school.repository';
import { InstructorRepository } from '../repositories/instructor.repository';
import { PricingRepository } from '../repositories/pricing.repository';
import { AuthMiddleware } from '../middleware/auth.middleware';

const router = Router();
const auth = new AuthMiddleware();

// Repositories
const schoolRepo = new SchoolRepository();
const instructorRepo = new InstructorRepository();
const pricingRepo = new PricingRepository();

// Services
const schoolService = new SchoolService(schoolRepo);
const instructorService = new InstructorService(instructorRepo);
const pricingService = new PricingService(pricingRepo);

// Controllers
const schoolController = new SchoolController(schoolService);
const instructorController = new InstructorController(instructorService);
const pricingController = new PricingController(pricingService);

// School Routes
router.post('/', auth.authenticate, auth.authorize('admin'), schoolController.createSchool);
router.get('/', schoolController.getAllSchools);
router.get('/:id', schoolController.getSchoolById);
router.put('/:id', auth.authenticate, auth.authorize('admin'), schoolController.updateSchool);
router.delete('/:id', auth.authenticate, auth.authorize('admin'), schoolController.deleteSchool);

// Instructor Routes
router.post(
  '/:schoolId/instructors',
  auth.authenticate,
  auth.authorize('admin'),
  instructorController.addInstructor
);
router.get('/:schoolId/instructors', instructorController.getInstructorsBySchool);
router.get('/instructors/:id', instructorController.getInstructorById);
router.put(
  '/instructors/:id',
  auth.authenticate,
  auth.authorize('admin'),
  instructorController.updateInstructor
);
router.delete(
  '/instructors/:id',
  auth.authenticate,
  auth.authorize('admin'),
  instructorController.deleteInstructor
);

// Pricing Routes
router.post(
  '/:schoolId/pricing',
  auth.authenticate,
  auth.authorize('admin'),
  pricingController.setPricing
);
router.get('/:schoolId/pricing', pricingController.getPricingBySchool);
router.delete(
  '/pricing/:id',
  auth.authenticate,
  auth.authorize('admin'),
  pricingController.deletePricing
);

export default router;
