import { RequestHandler, Router } from 'express';
import { Pool } from 'pg';
import { PgTransactionRunner } from '../../db/transaction';
import { SchoolGuard } from '../../http/authz';
import { SchoolController } from './controllers/school.controller';
import { DocumentTypeRepository } from './repositories/document-type.repository';
import { InstructorRepository } from './repositories/instructor.repository';
import { PricingRepository } from './repositories/pricing.repository';
import { SchoolRepository } from './repositories/school.repository';
import { createSchoolRouter } from './routes/school.routes';
import { DocumentTypeService } from './services/document-type.service';
import { InstructorService } from './services/instructor.service';
import { PricingService } from './services/pricing.service';
import { SchoolRosterSource, SchoolService } from './services/school.service';

export interface SchoolModuleDeps {
  db: Pool;
  requireAuth: RequestHandler;
  /** `InstructorRepository` partagé (câblé dans src/index.ts : auth, cloisonnement, ce module). */
  instructorRepository: InstructorRepository;
  /** `StudentRepository` du module student (S6, D-25). */
  roster: SchoolRosterSource;
  schoolGuard: SchoolGuard;
}

export interface SchoolModule {
  router: Router;
  schoolService: SchoolService;
  instructorService: InstructorService;
  /** Réutilisé par le module lesson pour copier le prix de la grille à l'approbation (D-30). */
  pricingService: PricingService;
}

export function buildSchoolModule({
  db,
  requireAuth,
  instructorRepository,
  roster,
  schoolGuard,
}: SchoolModuleDeps): SchoolModule {
  const schoolRepository = new SchoolRepository(db);
  const documentTypeRepository = new DocumentTypeRepository(db);
  const schoolService = new SchoolService(
    schoolRepository,
    roster,
    schoolGuard,
    documentTypeRepository,
    new PgTransactionRunner(db)
  );
  const instructorService = new InstructorService(instructorRepository);
  const pricingService = new PricingService(new PricingRepository(db), schoolGuard);
  const documentTypeService = new DocumentTypeService(
    documentTypeRepository,
    schoolRepository,
    schoolGuard
  );
  const controller = new SchoolController(
    schoolService,
    instructorService,
    pricingService,
    documentTypeService
  );

  return {
    router: createSchoolRouter(controller, requireAuth),
    schoolService,
    instructorService,
    pricingService,
  };
}
