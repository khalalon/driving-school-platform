import dotenv from 'dotenv';
import { DatabaseConfig } from './config/database.config';
import { PaymentRepository } from './repositories/payment.repository';
import { MockPaymentGateway } from './services/payment-gateway.service';
import { PaymentService } from './services/payment.service';
import { PaymentController } from './controllers/payment.controller';
import { AuthMiddleware } from './middleware/auth.middleware';
import { PaymentRoutes } from './routes/payment.routes';
import { App } from './app';

dotenv.config();

async function bootstrap(): Promise<void> {
  try {
    const port = process.env.PORT || 3005;

    const db = DatabaseConfig.getInstance();

    const paymentRepository = new PaymentRepository(db);
    const paymentGateway = new MockPaymentGateway();

    const paymentService = new PaymentService(paymentRepository, paymentGateway);

    const paymentController = new PaymentController(paymentService);
    const authMiddleware = new AuthMiddleware();

    const paymentRoutes = new PaymentRoutes(paymentController, authMiddleware);

    const app = new App(paymentRoutes);

    app.getApp().listen(port, () => {
      console.log(`✅ Payment service running on port ${port}`);
    });
  } catch (error) {
    console.error('❌ Failed to start payment service:', error);
    process.exit(1);
  }
}

bootstrap().catch((error) => {
  console.error('Fatal error during bootstrap:', error);
  process.exit(1);
});
