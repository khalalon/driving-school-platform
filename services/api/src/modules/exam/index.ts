import { RequestHandler, Router } from 'express';
import { Pool } from 'pg';
import { ExamController } from './controllers/exam.controller';
import { ExamRepository } from './repositories/exam.repository';
import { RegistrationRepository } from './repositories/registration.repository';
import { createExamRouter } from './routes/exam.routes';
import { ExamService } from './services/exam.service';
import { RegistrationService, StudentLookup } from './services/registration.service';

export interface ExamModuleDeps {
  db: Pool;
  requireAuth: RequestHandler;
  /** `StudentRepository` du module student. */
  students: StudentLookup;
}

export interface ExamModule {
  router: Router;
  examService: ExamService;
  registrationService: RegistrationService;
}

export function buildExamModule({ db, requireAuth, students }: ExamModuleDeps): ExamModule {
  const examRepository = new ExamRepository(db);
  const examService = new ExamService(examRepository);
  const registrationService = new RegistrationService(
    new RegistrationRepository(db),
    examRepository,
    students
  );
  const controller = new ExamController(examService, registrationService);

  return { router: createExamRouter(controller, requireAuth), examService, registrationService };
}
