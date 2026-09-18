import { Request, Response } from 'express';
import { sendCaughtError, sendValidationError } from '../../../http/errors';
import { uuidParam, validate } from '../../../http/validation';
import { PaymentService } from '../services/payment.service';
import {
  confirmPaymentSchema,
  createPaymentSchema,
  paymentFiltersSchema,
  refundPaymentSchema,
} from '../validators/payment.validator';

export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  createPayment = async (req: Request, res: Response): Promise<void> => {
    const parsed = validate(createPaymentSchema, req.body);
    if (!parsed.ok) {
      sendValidationError(res, parsed.detail);
      return;
    }
    try {
      res.status(201).json(await this.paymentService.createPayment(parsed.value));
    } catch (err) {
      sendCaughtError(res, err);
    }
  };

  getPayment = async (req: Request, res: Response): Promise<void> => {
    try {
      res.json(await this.paymentService.getPaymentById(uuidParam(req.params.id, 'Paiement')));
    } catch (err) {
      sendCaughtError(res, err);
    }
  };

  getPayments = async (req: Request, res: Response): Promise<void> => {
    const parsed = validate(paymentFiltersSchema, req.query);
    if (!parsed.ok) {
      sendValidationError(res, parsed.detail);
      return;
    }
    try {
      res.json(await this.paymentService.getPayments(parsed.value));
    } catch (err) {
      sendCaughtError(res, err);
    }
  };

  processOnlinePayment = async (req: Request, res: Response): Promise<void> => {
    try {
      res.json(
        await this.paymentService.processOnlinePayment(uuidParam(req.params.id, 'Paiement'))
      );
    } catch (err) {
      sendCaughtError(res, err);
    }
  };

  confirmPayment = async (req: Request, res: Response): Promise<void> => {
    const parsed = validate(confirmPaymentSchema, req.body);
    if (!parsed.ok) {
      sendValidationError(res, parsed.detail);
      return;
    }
    try {
      res.json(await this.paymentService.confirmPayment(parsed.value.transactionId));
    } catch (err) {
      sendCaughtError(res, err);
    }
  };

  markAsPaid = async (req: Request, res: Response): Promise<void> => {
    try {
      res.json(await this.paymentService.markAsPaid(uuidParam(req.params.id, 'Paiement')));
    } catch (err) {
      sendCaughtError(res, err);
    }
  };

  refundPayment = async (req: Request, res: Response): Promise<void> => {
    const parsed = validate(refundPaymentSchema, req.body);
    if (!parsed.ok) {
      sendValidationError(res, parsed.detail);
      return;
    }
    try {
      const id = uuidParam(req.params.id, 'Paiement');
      res.json(await this.paymentService.refundPayment(id, parsed.value.reason));
    } catch (err) {
      sendCaughtError(res, err);
    }
  };

  getPaymentSummary = async (req: Request, res: Response): Promise<void> => {
    try {
      res.json(
        await this.paymentService.getPaymentSummary(uuidParam(req.params.studentId, 'Élève'))
      );
    } catch (err) {
      sendCaughtError(res, err);
    }
  };

  deletePayment = async (req: Request, res: Response): Promise<void> => {
    try {
      await this.paymentService.deletePayment(uuidParam(req.params.id, 'Paiement'));
      res.status(204).send();
    } catch (err) {
      sendCaughtError(res, err);
    }
  };
}
