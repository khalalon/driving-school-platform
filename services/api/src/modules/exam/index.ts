import { RequestHandler, Router } from 'express';
import { Pool } from 'pg';
import { ExamController } from './controllers/exam.controller';
import { ExamRepository } from './repositories/exam.repository';
import { createExamRouter } from './routes/exam.routes';
import { ExamService } from './services/exam.service';

export interface ExamModuleDeps {
  db: Pool;
  requireAuth: RequestHandler;
}

export interface ExamModule {
  router: Router;
  examService: ExamService;
}

export function buildExamModule({ db, requireAuth }: ExamModuleDeps): ExamModule {
  const examService = new ExamService(new ExamRepository(db));
  return { router: createExamRouter(new ExamController(examService), requireAuth), examService };
}
