import { RequestHandler, Router } from 'express';
import { Pool } from 'pg';
import { PgTransactionRunner } from '../../db/transaction';
import { EnrollmentController } from './controllers/enrollment.controller';
import { ProfileController } from './controllers/profile.controller';
import { VerificationController } from './controllers/verification.controller';
import { EnrollmentRepository } from './repositories/enrollment.repository';
import { ProfileRepository } from './repositories/profile.repository';
import { StatsRepository } from './repositories/stats.repository';
import { StudentRepository } from './repositories/student.repository';
import { createEnrollmentRouter } from './routes/enrollment.routes';
import { createProfileRouter, createStudentProfileRouter } from './routes/profile.routes';
import { createVerificationRouter } from './routes/verification.routes';
import { EnrollmentService } from './services/enrollment.service';
import { ProfileService } from './services/profile.service';
import { VerificationService } from './services/verification.service';

export interface StudentModuleDeps {
  db: Pool;
  requireAuth: RequestHandler;
}

export interface StudentModule {
  enrollmentRouter: Router;
  profileRouter: Router;
  studentProfileRouter: Router;
  verificationRouter: Router;
  enrollmentService: EnrollmentService;
  /** Réutilisés par lesson / exam : inscription approuvée (NOT_ENROLLED) et compteurs de leçons. */
  studentRepository: StudentRepository;
  statsRepository: StatsRepository;
}

export function buildStudentModule({ db, requireAuth }: StudentModuleDeps): StudentModule {
  const enrollmentRepository = new EnrollmentRepository(db);
  const studentRepository = new StudentRepository(db);
  const statsRepository = new StatsRepository(db);
  const profileRepository = new ProfileRepository(db);

  const enrollmentService = new EnrollmentService(
    enrollmentRepository,
    studentRepository,
    new PgTransactionRunner(db)
  );
  const profileService = new ProfileService(profileRepository);
  const verificationService = new VerificationService(studentRepository, statsRepository);

  const profileController = new ProfileController(profileService);

  return {
    enrollmentRouter: createEnrollmentRouter(
      new EnrollmentController(enrollmentService),
      requireAuth
    ),
    profileRouter: createProfileRouter(profileController, requireAuth),
    studentProfileRouter: createStudentProfileRouter(profileController, requireAuth),
    verificationRouter: createVerificationRouter(new VerificationController(verificationService)),
    enrollmentService,
    studentRepository,
    statsRepository,
  };
}
