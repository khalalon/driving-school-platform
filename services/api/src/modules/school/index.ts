import { RequestHandler, Router } from 'express';
import { Pool } from 'pg';
import { SchoolController } from './controllers/school.controller';
import { InstructorRepository } from './repositories/instructor.repository';
import { PricingRepository } from './repositories/pricing.repository';
import { SchoolRepository } from './repositories/school.repository';
import { createSchoolRouter } from './routes/school.routes';
import { InstructorService } from './services/instructor.service';
import { PricingService } from './services/pricing.service';
import { SchoolService } from './services/school.service';

export interface SchoolModuleDeps {
  db: Pool;
  requireAuth: RequestHandler;
}

export interface SchoolModule {
  router: Router;
  schoolService: SchoolService;
  instructorService: InstructorService;
  /** Réutilisé par le module lesson pour copier le prix de la grille à l'approbation (D-30). */
  pricingService: PricingService;
}

export function buildSchoolModule({ db, requireAuth }: SchoolModuleDeps): SchoolModule {
  const schoolService = new SchoolService(new SchoolRepository(db));
  const instructorService = new InstructorService(new InstructorRepository(db));
  const pricingService = new PricingService(new PricingRepository(db));
  const controller = new SchoolController(schoolService, instructorService, pricingService);

  return {
    router: createSchoolRouter(controller, requireAuth),
    schoolService,
    instructorService,
    pricingService,
  };
}
