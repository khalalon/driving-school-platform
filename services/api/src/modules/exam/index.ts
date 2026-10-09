import { RequestHandler, Router } from 'express';
import { Pool } from 'pg';
import { SchoolGuard } from '../../http/authz';
import { ExamController } from './controllers/exam.controller';
import { ExamRepository } from './repositories/exam.repository';
import { createExamRouter } from './routes/exam.routes';
import {
  ExamService,
  InstructorLookup,
  StudentFileLookup,
  StudentLookup,
} from './services/exam.service';

export interface ExamModuleDeps {
  db: Pool;
  requireAuth: RequestHandler;
  /** `StudentRepository` du module student. */
  students: StudentLookup;
  /** `InstructorRepository` partagé (module school). */
  instructors: InstructorLookup;
  /** `StudentFileRepository` du module student : dossier administratif joint aux examens (16.3). */
  files: StudentFileLookup;
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
  files,
}: ExamModuleDeps): ExamModule {
  const examService = new ExamService(
    new ExamRepository(db),
    students,
    instructors,
    schoolGuard,
    files
  );
  return { router: createExamRouter(new ExamController(examService), requireAuth), examService };
}
