import { RequestHandler, Router } from 'express';
import { authorize } from '../../../middleware/auth.middleware';
import { UserRole } from '../../../types/auth';
import { SchoolController } from '../controllers/school.controller';

/**
 * S1–S4 du contrat (lecture publique), S7–S9 (fiche et tarifs tenus par l'instructeur de
 * l'école, D-51) + routes d'administration hors contrat mobile (§8), réservées à `admin`.
 * Mêmes chemins que l'ancien school-service ; le cloisonnement par école vit dans les services.
 */
export function createSchoolRouter(
  controller: SchoolController,
  requireAuth: RequestHandler
): Router {
  const router = Router();
  const adminOnly = [requireAuth, authorize(UserRole.ADMIN)];
  // S7–S9 (D-51) : l'école reste créée par l'admin, mais son instructeur l'entretient.
  const schoolStaff = [requireAuth, authorize(UserRole.INSTRUCTOR, UserRole.ADMIN)];

  router.post('/', ...adminOnly, controller.createSchool);
  router.get('/', controller.getAllSchools);

  // Sous-ressources déclarées avant `/:id` pour lever toute ambiguïté de lecture.
  router.get('/instructors/:id', ...adminOnly, controller.getInstructorById);
  router.put('/instructors/:id', ...adminOnly, controller.updateInstructor);
  router.delete('/instructors/:id', ...adminOnly, controller.deleteInstructor);
  router.delete('/pricing/:id', ...schoolStaff, controller.deletePricing);

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
  router.post('/:schoolId/pricing', ...schoolStaff, controller.setPricing);

  router.get('/:id', controller.getSchoolById);
  router.put('/:id', ...schoolStaff, controller.updateSchool);
  router.delete('/:id', ...adminOnly, controller.deleteSchool);

  return router;
}
