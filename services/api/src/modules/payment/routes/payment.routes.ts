import { RequestHandler, Router } from 'express';
import { authorize } from '../../../middleware/auth.middleware';
import { UserRole } from '../../../types/auth';
import { PaymentController } from '../controllers/payment.controller';

/** Mêmes chemins que payment-service ; ce routeur n'est PAS monté dans app.ts (D-31). */
export function createPaymentRouter(
  controller: PaymentController,
  requireAuth: RequestHandler
): Router {
  const router = Router();
  const adminOnly = [requireAuth, authorize(UserRole.ADMIN)];

  router.post(
    '/',
    requireAuth,
    authorize(UserRole.ADMIN, UserRole.STUDENT),
    controller.createPayment
  );
  router.get('/', ...adminOnly, controller.getPayments);
  router.post('/confirm', controller.confirmPayment);
  router.get('/students/:studentId/summary', requireAuth, controller.getPaymentSummary);
  router.get('/:id', requireAuth, controller.getPayment);
  router.post('/:id/process', requireAuth, controller.processOnlinePayment);
  router.post('/:id/mark-paid', ...adminOnly, controller.markAsPaid);
  router.post('/:id/refund', ...adminOnly, controller.refundPayment);
  router.delete('/:id', ...adminOnly, controller.deletePayment);

  return router;
}
