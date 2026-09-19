import dotenv from 'dotenv';
import { createApp } from './app';
import { createPool } from './config/database';
import { loadEnv } from './config/env';
import { createRedisClient } from './config/redis';
import { buildAuthModule } from './modules/auth';
import { buildExamModule } from './modules/exam';
import { buildLessonModule } from './modules/lesson';
import { buildSchoolModule } from './modules/school';
import { buildStudentModule } from './modules/student';
import { SchoolGuard } from './http/authz';
import { InstructorRepository } from './modules/school/repositories/instructor.repository';

dotenv.config();

async function bootstrap(): Promise<void> {
  const env = loadEnv();
  const db = createPool(env.DATABASE_URL);
  const redis = await createRedisClient(env.REDIS_URL);

  // Partagés entre modules : fiche instructeur (A2, A3) et cloisonnement par école (D-20).
  const instructorRepository = new InstructorRepository(db);
  const schoolGuard = new SchoolGuard(instructorRepository);

  const auth = buildAuthModule({ db, redis, env, instructors: instructorRepository });
  const student = buildStudentModule({ db, requireAuth: auth.requireAuth, schoolGuard });
  const school = buildSchoolModule({
    db,
    requireAuth: auth.requireAuth,
    instructorRepository,
    roster: student.studentRepository,
    schoolGuard,
  });
  const lesson = buildLessonModule({
    db,
    requireAuth: auth.requireAuth,
    students: student.studentRepository,
    instructors: instructorRepository,
    pricing: school.pricingService,
    stats: student.statsRepository,
    schoolGuard,
    cancelWindowHours: env.LESSON_CANCEL_HOURS,
  });
  const exam = buildExamModule({
    db,
    requireAuth: auth.requireAuth,
    students: student.studentRepository,
    instructors: instructorRepository,
    schoolGuard,
  });

  const app = createApp({
    auth: auth.router,
    schools: school.router,
    enrollment: student.enrollmentRouter,
    profiles: student.profileRouter,
    'student-profiles': student.studentProfileRouter,
    verification: student.verificationRouter,
    lessons: lesson.router,
    exams: exam.router,
  });

  app.listen(env.PORT, () => {
    console.info(`API démarrée sur le port ${env.PORT} (${env.NODE_ENV})`);
  });
}

bootstrap().catch((error: unknown) => {
  console.error('Démarrage impossible :', error instanceof Error ? error.message : error);
  process.exit(1);
});
