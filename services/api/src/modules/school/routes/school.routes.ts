import { RequestHandler, Router } from 'express';
import { authorize } from '../../../middleware/auth.middleware';
import { UserRole } from '../../../types/auth';
import { SchoolController } from '../controllers/school.controller';

/**
 * S1–S4 du contrat (lecture publique), S7–S9 (fiche et tarifs tenus par le gérant de l'école,
 * D-51 puis D-56), F1–F4 (pièces du dossier : lecture par l'instructeur, gestion par le gérant) + routes d'administration hors contrat mobile (§8), réservées à `admin`.
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
  // F3, F4 (D-61) : la pièce porte son école, le service y vérifie le gérant (D-56 (b)).
  router.put('/document-types/:id', ...schoolStaff, controller.renameDocumentType);
  router.delete('/document-types/:id', ...schoolStaff, controller.removeDocumentType);

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
  // F1 : lecture par tout instructeur de l'école ; F2 : ajout par son gérant.
  router.get('/:schoolId/document-types', ...schoolStaff, controller.listDocumentTypes);
  router.post('/:schoolId/document-types', ...schoolStaff, controller.addDocumentType);

  router.get('/:id', controller.getSchoolById);
  router.put('/:id', ...schoolStaff, controller.updateSchool);
  router.delete('/:id', ...adminOnly, controller.deleteSchool);

  return router;
}
