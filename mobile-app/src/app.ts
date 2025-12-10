import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import enrollmentRoutes from './routes/enrollment.routes';
import verificationRoutes from './routes/verification.routes';
import profileRoutes from './routes/profile.routes';

export class App {
  private app: Application;

  constructor() {
    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();
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

  private setupRoutes(): void {
    this.app.get('/health', (_, res) => {
      res.status(200).json({ status: 'ok' });
    });

    this.app.use('/api/enrollment', enrollmentRoutes);
    this.app.use('/api/verification', verificationRoutes);
    this.app.use('/api/profiles', profileRoutes);
  }

  public getApp(): Application {
    return this.app;
  }
}
