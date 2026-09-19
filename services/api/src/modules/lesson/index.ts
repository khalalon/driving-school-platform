import { RequestHandler, Router } from 'express';
import { Pool } from 'pg';
import { PgTransactionRunner } from '../../db/transaction';
import { SchoolGuard } from '../../http/authz';
import { LessonController } from './controllers/lesson.controller';
import { LessonRepository } from './repositories/lesson.repository';
import { createLessonRouter } from './routes/lesson.routes';
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
  const lessonService = new LessonService(
    new LessonRepository(db),
    students,
    instructors,
    pricing,
    stats,
    new PgTransactionRunner(db),
    schoolGuard,
    cancelWindowHours,
    students
  );
  return {
    router: createLessonRouter(new LessonController(lessonService), requireAuth),
    lessonService,
  };
}
