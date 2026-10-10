import dotenv from 'dotenv';
import { createApp } from './app';
import { createPool } from './config/database';
import { loadEnv } from './config/env';
import { createRedisClient } from './config/redis';
import { buildAuthModule } from './modules/auth';
import { buildExamModule } from './modules/exam';
import { buildLessonModule } from './modules/lesson';
import { buildNotificationModule } from './modules/notification';
import {
  LessonReminderJob,
  startLessonReminders,
} from './modules/notification/jobs/lesson-reminder.job';
import { RedisJobLock } from './modules/notification/jobs/redis-job-lock';
import { ReminderRepository } from './modules/lesson/repositories/reminder.repository';
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
  // Avant student / lesson / exam : ils reçoivent le notifier (17.4, D-63).
  const notification = buildNotificationModule({
    db,
    requireAuth: auth.requireAuth,
    driver: env.NOTIFICATIONS_DRIVER,
    instructors: instructorRepository,
  });
  const student = buildStudentModule({
    db,
    requireAuth: auth.requireAuth,
    schoolGuard,
    notifier: notification.notifier,
  });
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
    notifier: notification.notifier,
    cancelWindowHours: env.LESSON_CANCEL_HOURS,
  });
  const exam = buildExamModule({
    db,
    requireAuth: auth.requireAuth,
    students: student.studentRepository,
    instructors: instructorRepository,
    schoolGuard,
    files: student.studentFileRepository,
    notifier: notification.notifier,
  });

  const app = createApp({
    auth: auth.router,
    notifications: notification.router,
    schools: school.router,
    enrollment: student.enrollmentRouter,
    profiles: student.profileRouter,
    'student-profiles': student.studentProfileRouter,
    lessons: lesson.router,
    instructors: lesson.availabilityRouter,
    exams: exam.router,
  });

  app.listen(env.PORT, () => {
    console.info(`API démarrée sur le port ${env.PORT} (${env.NODE_ENV})`);
  });

  // Rappel de la veille à 18 h (17.5, D-65) : toutes les 15 min, une seule instance à la fois.
  startLessonReminders(
    new LessonReminderJob(
      new ReminderRepository(db),
      notification.notifier,
      new RedisJobLock(redis)
    )
  );
}

bootstrap().catch((error: unknown) => {
  console.error('Démarrage impossible :', error instanceof Error ? error.message : error);
  process.exit(1);
});
