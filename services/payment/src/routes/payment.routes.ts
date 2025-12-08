import { Router } from 'express';
import { PaymentController } from '../controllers/payment.controller';
import { AuthMiddleware } from '../middleware/auth.middleware';

export class PaymentRoutes {
  constructor(
    private readonly paymentController: PaymentController,
    private readonly authMiddleware: AuthMiddleware
  ) {}

  createRouter(): Router {
    const router = Router();

    router.post(
      '/',
      this.authMiddleware.authenticate,
      this.authMiddleware.authorize('admin', 'student'),
      this.paymentController.createPayment
    );

    router.get(
      '/',
      this.authMiddleware.authenticate,
      this.authMiddleware.authorize('admin'),
      this.paymentController.getPayments
    );

    router.get('/:id', this.authMiddleware.authenticate, this.paymentController.getPayment);

    router.post(
      '/:id/process',
      this.authMiddleware.authenticate,
      this.paymentController.processOnlinePayment
    );

    router.post('/confirm', this.paymentController.confirmPayment);

    router.post(
      '/:id/mark-paid',
      this.authMiddleware.authenticate,
      this.authMiddleware.authorize('admin'),
      this.paymentController.markAsPaid
    );

    router.post(
      '/:id/refund',
      this.authMiddleware.authenticate,
      this.authMiddleware.authorize('admin'),
      this.paymentController.refundPayment
    );

    router.get(
      '/students/:studentId/summary',
      this.authMiddleware.authenticate,
      this.paymentController.getPaymentSummary
    );

    router.delete(
      '/:id',
      this.authMiddleware.authenticate,
      this.authMiddleware.authorize('admin'),
      this.paymentController.deletePayment
    );

    return router;
  }
}
