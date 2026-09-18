import { RequestHandler, Router } from 'express';
import { Pool } from 'pg';
import { PaymentController } from './controllers/payment.controller';
import { PaymentRepository } from './repositories/payment.repository';
import { createPaymentRouter } from './routes/payment.routes';
import { IPaymentGateway, MockPaymentGateway } from './services/payment-gateway.service';
import { PaymentService } from './services/payment.service';

export interface PaymentModuleDeps {
  db: Pool;
  requireAuth: RequestHandler;
  gateway?: IPaymentGateway;
}

export interface PaymentModule {
  router: Router;
  paymentService: PaymentService;
}

/**
 * Module porté mais **non monté** (D-31 : le paiement est manuel en v1, suivi par les colonnes
 * `paid` / `amount` des leçons et examens). `index.ts` ne l'appelle pas.
 */
export function buildPaymentModule({ db, requireAuth, gateway }: PaymentModuleDeps): PaymentModule {
  const paymentService = new PaymentService(
    new PaymentRepository(db),
    gateway ?? new MockPaymentGateway()
  );
  const controller = new PaymentController(paymentService);
  return { router: createPaymentRouter(controller, requireAuth), paymentService };
}
