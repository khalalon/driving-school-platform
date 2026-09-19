import { RequestHandler, Router } from 'express';
import { Pool } from 'pg';
import { SchoolGuard } from '../../http/authz';
import { LessonController } from './controllers/lesson.controller';
import { LessonRepository } from './repositories/lesson.repository';
import { createLessonRouter } from './routes/lesson.routes';
import { InstructorLookup, LessonService, StudentLookup } from './services/lesson.service';

export interface LessonModuleDeps {
  db: Pool;
  requireAuth: RequestHandler;
  /** `StudentRepository` du module student : une seule lecture de `students` dans l'application. */
  students: StudentLookup;
  /** `InstructorRepository` partagé (module school). */
  instructors: InstructorLookup;
  schoolGuard: SchoolGuard;
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
  schoolGuard,
}: LessonModuleDeps): LessonModule {
  const lessonService = new LessonService(
    new LessonRepository(db),
    students,
    instructors,
    schoolGuard
  );
  return {
    router: createLessonRouter(new LessonController(lessonService), requireAuth),
    lessonService,
  };
}
