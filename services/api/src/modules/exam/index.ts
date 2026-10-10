import { RequestHandler, Router } from 'express';
import { Pool } from 'pg';
import { SchoolGuard } from '../../http/authz';
import { SchoolNotifier } from '../notification/types/notification.types';
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
  /** Notifications des examens (17.4, D-63) : X2 vers l'école, X3 / X4 / X5 vers l'élève. */
  notifier: SchoolNotifier;
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
  notifier,
}: ExamModuleDeps): ExamModule {
  const examService = new ExamService(
    new ExamRepository(db),
    students,
    instructors,
    schoolGuard,
    files,
    notifier
  );
  return { router: createExamRouter(new ExamController(examService), requireAuth), examService };
}
