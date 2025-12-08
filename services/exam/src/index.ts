import dotenv from 'dotenv';
import { DatabaseConfig } from './config/database.config';
import { ExamRepository } from './repositories/exam.repository';
import { RegistrationRepository } from './repositories/registration.repository';
import { StudentRepository } from './repositories/student.repository';
import { ExamService } from './services/exam.service';
import { RegistrationService } from './services/registration.service';
import { ExamController } from './controllers/exam.controller';
import { RegistrationController } from './controllers/registration.controller';
import { AuthMiddleware } from './middleware/auth.middleware';
import { ExamRoutes } from './routes/exam.routes';
import { App } from './app';

dotenv.config();

async function bootstrap(): Promise<void> {
  try {
    const port = process.env.PORT || 3004;

    const db = DatabaseConfig.getInstance();

    const examRepository = new ExamRepository(db);
    const registrationRepository = new RegistrationRepository(db);
    const studentRepository = new StudentRepository(db);

    const examService = new ExamService(examRepository);
    const registrationService = new RegistrationService(
      registrationRepository,
      examRepository,
      studentRepository
    );

    const examController = new ExamController(examService);
    const registrationController = new RegistrationController(registrationService);
    const authMiddleware = new AuthMiddleware();

    const examRoutes = new ExamRoutes(examController, registrationController, authMiddleware);

    const app = new App(examRoutes);

    app.getApp().listen(port, () => {
      console.log(`✅ Exam service running on port ${port}`);
    });
  } catch (error) {
    console.error('❌ Failed to start exam service:', error);
    process.exit(1);
  }
}

bootstrap().catch((error) => {
  console.error('Fatal error during bootstrap:', error);
  process.exit(1);
});
