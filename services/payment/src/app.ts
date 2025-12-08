import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { PaymentRoutes } from './routes/payment.routes';

export class App {
  private app: Application;

  constructor(paymentRoutes: PaymentRoutes) {
    this.app = express();
    this.setupMiddleware();
    this.setupRoutes(paymentRoutes);
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

  private setupRoutes(paymentRoutes: PaymentRoutes): void {
    this.app.get('/health', (_, res) => {
      res.status(200).json({ status: 'ok' });
    });

    this.app.use('/api/payments', paymentRoutes.createRouter());
  }

  public getApp(): Application {
    return this.app;
  }
}
