import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { AuthRoutes } from './routes/auth.routes';

export class App {
  private app: Application;

  constructor(authRoutes: AuthRoutes) {
    this.app = express();
    this.setupMiddleware();
    this.setupRoutes(authRoutes);
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

  private setupRoutes(authRoutes: AuthRoutes): void {
    this.app.get('/health', (_, res) => {
      res.status(200).json({ status: 'ok' });
    });

    this.app.use('/api/auth', authRoutes.createRouter());
  }

  public getApp(): Application {
    return this.app;
  }
}
