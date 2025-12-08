import dotenv from 'dotenv';
import { DatabaseConfig } from './config/database.config';
import { LessonRepository } from './repositories/lesson.repository';
import { BookingRepository } from './repositories/booking.repository';
import { StudentRepository } from './repositories/student.repository';
import { LessonService } from './services/lesson.service';
import { BookingService } from './services/booking.service';
import { LessonController } from './controllers/lesson.controller';
import { BookingController } from './controllers/booking.controller';
import { AuthMiddleware } from './middleware/auth.middleware';
import { LessonRoutes } from './routes/lesson.routes';
import { App } from './app';

dotenv.config();

async function bootstrap(): Promise<void> {
  try {
    const port = process.env.PORT || 3003;

    const db = DatabaseConfig.getInstance();

    const lessonRepository = new LessonRepository(db);
    const bookingRepository = new BookingRepository(db);
    const studentRepository = new StudentRepository(db);

    const lessonService = new LessonService(lessonRepository);
    const bookingService = new BookingService(
      bookingRepository,
      lessonRepository,
      studentRepository
    );

    const lessonController = new LessonController(lessonService);
    const bookingController = new BookingController(bookingService);
    const authMiddleware = new AuthMiddleware();

    const lessonRoutes = new LessonRoutes(lessonController, bookingController, authMiddleware);

    const app = new App(lessonRoutes);

    app.getApp().listen(port, () => {
      console.log(`✅ Lesson service running on port ${port}`);
    });
  } catch (error) {
    console.error('❌ Failed to start lesson service:', error);
    process.exit(1);
  }
}

bootstrap().catch((error) => {
  console.error('Fatal error during bootstrap:', error);
  process.exit(1);
});
