import { RequestHandler, Router } from 'express';
import { Pool } from 'pg';
import { SchoolGuard } from '../../http/authz';
import { ExamController } from './controllers/exam.controller';
import { ExamRepository } from './repositories/exam.repository';
import { createExamRouter } from './routes/exam.routes';
import { ExamService, InstructorLookup, StudentLookup } from './services/exam.service';

export interface ExamModuleDeps {
  db: Pool;
  requireAuth: RequestHandler;
  /** `StudentRepository` du module student. */
  students: StudentLookup;
  /** `InstructorRepository` partagé (module school). */
  instructors: InstructorLookup;
  schoolGuard: SchoolGuard;
}

export interface ExamModule {
  router: Router;
  examService: ExamService;
}

export function buildExamModule({
  db,
  requireAuth,
  students,
  instructors,
  schoolGuard,
}: ExamModuleDeps): ExamModule {
  const examService = new ExamService(new ExamRepository(db), students, instructors, schoolGuard);
  return { router: createExamRouter(new ExamController(examService), requireAuth), examService };
}
