import { RequestHandler, Router } from 'express';
import { Pool } from 'pg';
import { LessonController } from './controllers/lesson.controller';
import { BookingRepository } from './repositories/booking.repository';
import { LessonRepository } from './repositories/lesson.repository';
import { createLessonRouter } from './routes/lesson.routes';
import { BookingService, StudentLookup } from './services/booking.service';
import { LessonService } from './services/lesson.service';

export interface LessonModuleDeps {
  db: Pool;
  requireAuth: RequestHandler;
  /** `StudentRepository` du module student : une seule requête `students` dans l'application. */
  students: StudentLookup;
}

export interface LessonModule {
  router: Router;
  lessonService: LessonService;
  bookingService: BookingService;
}

export function buildLessonModule({ db, requireAuth, students }: LessonModuleDeps): LessonModule {
  const lessonRepository = new LessonRepository(db);
  const lessonService = new LessonService(lessonRepository);
  const bookingService = new BookingService(new BookingRepository(db), lessonRepository, students);
  const controller = new LessonController(lessonService, bookingService);

  return { router: createLessonRouter(controller, requireAuth), lessonService, bookingService };
}
