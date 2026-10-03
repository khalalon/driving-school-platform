import { RequestHandler, Router } from 'express';
import { Pool } from 'pg';
import { PgTransactionRunner } from '../../db/transaction';
import { SchoolGuard } from '../../http/authz';
import { AvailabilityController } from './controllers/availability.controller';
import { LessonController } from './controllers/lesson.controller';
import { AvailabilityRepository } from './repositories/availability.repository';
import { LessonRepository } from './repositories/lesson.repository';
import { createAvailabilityRouter } from './routes/availability.routes';
import { createLessonRouter } from './routes/lesson.routes';
import { AvailabilityService } from './services/availability.service';
import { ScheduleConflictChecker } from './services/schedule-conflict.checker';
import {
  CreditLedger,
  InstructorLookup,
  LessonService,
  LessonStatsSink,
  PricingLookup,
  StudentLookup,
} from './services/lesson.service';

export interface LessonModuleDeps {
  db: Pool;
  requireAuth: RequestHandler;
  /** `StudentRepository` du module student : une seule lecture de `students` dans l'application. */
  students: StudentLookup & CreditLedger;
  /** `InstructorRepository` partagé (module school). */
  instructors: InstructorLookup;
  /** `PricingService` du module school : prix figé à l'approbation (D-30). */
  pricing: PricingLookup;
  /** `StatsRepository` du module student : compteurs de leçons effectuées (L7, D-33). */
  stats: LessonStatsSink;
  schoolGuard: SchoolGuard;
  /** `LESSON_CANCEL_HOURS` (D-24). */
  cancelWindowHours: number;
}

export interface LessonModule {
  router: Router;
  /** I1–I2 (15.6), monté sous `/api/instructors`. */
  availabilityRouter: Router;
  lessonService: LessonService;
}

export function buildLessonModule({
  db,
  requireAuth,
  students,
  instructors,
  pricing,
  stats,
  schoolGuard,
  cancelWindowHours,
}: LessonModuleDeps): LessonModule {
  const lessonRepository = new LessonRepository(db);
  const transactions = new PgTransactionRunner(db);
  const lessonService = new LessonService(
    lessonRepository,
    students,
    instructors,
    pricing,
    stats,
    transactions,
    schoolGuard,
    cancelWindowHours,
    students,
    new ScheduleConflictChecker(lessonRepository)
  );
  const availabilityService = new AvailabilityService(
    new AvailabilityRepository(db, transactions),
    instructors
  );
  return {
    router: createLessonRouter(new LessonController(lessonService), requireAuth),
    availabilityRouter: createAvailabilityRouter(
      new AvailabilityController(availabilityService),
      requireAuth
    ),
    lessonService,
  };
}
