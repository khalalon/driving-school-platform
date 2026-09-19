import { RequestHandler, Router } from 'express';
import { authorize } from '../../../middleware/auth.middleware';
import { UserRole } from '../../../types/auth';
import { SchoolController } from '../controllers/school.controller';

/**
 * S1–S4 du contrat (lecture publique) + routes d'administration hors contrat mobile (§8),
 * réservées à `admin`. Mêmes chemins que l'ancien school-service.
 */
export function createSchoolRouter(
  controller: SchoolController,
  requireAuth: RequestHandler
): Router {
  const router = Router();
  const adminOnly = [requireAuth, authorize(UserRole.ADMIN)];

  router.post('/', ...adminOnly, controller.createSchool);
  router.get('/', controller.getAllSchools);

  // Sous-ressources déclarées avant `/:id` pour lever toute ambiguïté de lecture.
  router.get('/instructors/:id', ...adminOnly, controller.getInstructorById);
  router.put('/instructors/:id', ...adminOnly, controller.updateInstructor);
  router.delete('/instructors/:id', ...adminOnly, controller.deleteInstructor);
  router.delete('/pricing/:id', ...adminOnly, controller.deletePricing);

  router.get('/:schoolId/instructors', controller.getInstructorsBySchool);
  // S6 (D-25) : instructeur de cette école ou admin (cloisonnement dans le service).
  router.get(
    '/:schoolId/students',
    requireAuth,
    authorize(UserRole.INSTRUCTOR, UserRole.ADMIN),
    controller.getSchoolStudents
  );
  router.post('/:schoolId/instructors', ...adminOnly, controller.addInstructor);
  router.get('/:schoolId/pricing', controller.getPricingBySchool);
  router.post('/:schoolId/pricing', ...adminOnly, controller.setPricing);

  router.get('/:id', controller.getSchoolById);
  router.put('/:id', ...adminOnly, controller.updateSchool);
  router.delete('/:id', ...adminOnly, controller.deleteSchool);

  return router;
}
