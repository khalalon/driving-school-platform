import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { ExamRoutes } from './routes/exam.routes';

export class App {
  private app: Application;

  constructor(examRoutes: ExamRoutes) {
    this.app = express();
    this.setupMiddleware();
    this.setupRoutes(examRoutes);
  }

  private setupMiddleware(): void {
    this.app.use(helmet());
    this.app.use(cors());
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));

    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 100,
    });
    this.app.use(limiter);
  }

  private setupRoutes(examRoutes: ExamRoutes): void {
    this.app.get('/health', (_, res) => {
      res.status(200).json({ status: 'ok' });
    });

    this.app.use('/api/exams', examRoutes.createRouter());
  }

  public getApp(): Application {
    return this.app;
  }
}
