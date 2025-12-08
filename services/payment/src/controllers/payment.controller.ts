import { Request, Response } from 'express';
import { PaymentService } from '../services/payment.service';
import {
  createPaymentSchema,
  confirmPaymentSchema,
  refundPaymentSchema,
  paymentFiltersSchema,
} from '../validators/payment.validator';

export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  createPayment = async (req: Request, res: Response): Promise<void> => {
    try {
      const { error, value } = createPaymentSchema.validate(req.body);
      if (error) {
        res.status(400).json({ error: error.details[0].message });
        return;
      }

      const payment = await this.paymentService.createPayment(value);
      res.status(201).json(payment);
    } catch (err) {
      const error = err as Error;
      res.status(400).json({ error: error.message });
    }
  };

  getPayment = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const payment = await this.paymentService.getPaymentById(id);
      res.status(200).json(payment);
    } catch (err) {
      const error = err as Error;
      res.status(404).json({ error: error.message });
    }
  };

  getPayments = async (req: Request, res: Response): Promise<void> => {
    try {
      const { error, value } = paymentFiltersSchema.validate(req.query);
      if (error) {
        res.status(400).json({ error: error.details[0].message });
        return;
      }

      const payments = await this.paymentService.getPayments(value);
      res.status(200).json(payments);
    } catch (err) {
      const error = err as Error;
      res.status(400).json({ error: error.message });
    }
  };

  processOnlinePayment = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const result = await this.paymentService.processOnlinePayment(id);
      res.status(200).json(result);
    } catch (err) {
      const error = err as Error;
      res.status(400).json({ error: error.message });
    }
  };

  confirmPayment = async (req: Request, res: Response): Promise<void> => {
    try {
      const { error, value } = confirmPaymentSchema.validate(req.body);
      if (error) {
        res.status(400).json({ error: error.details[0].message });
        return;
      }

      const payment = await this.paymentService.confirmPayment(value.transactionId);
      res.status(200).json(payment);
    } catch (err) {
      const error = err as Error;
      res.status(400).json({ error: error.message });
    }
  };

  markAsPaid = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const payment = await this.paymentService.markAsPaid(id);
      res.status(200).json(payment);
    } catch (err) {
      const error = err as Error;
      res.status(400).json({ error: error.message });
    }
  };

  refundPayment = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { error, value } = refundPaymentSchema.validate(req.body);
      if (error) {
        res.status(400).json({ error: error.details[0].message });
        return;
      }

      const payment = await this.paymentService.refundPayment(id, value.reason);
      res.status(200).json(payment);
    } catch (err) {
      const error = err as Error;
      res.status(400).json({ error: error.message });
    }
  };

  getPaymentSummary = async (req: Request, res: Response): Promise<void> => {
    try {
      const { studentId } = req.params;
      const summary = await this.paymentService.getPaymentSummary(studentId);
      res.status(200).json(summary);
    } catch (err) {
      const error = err as Error;
      res.status(400).json({ error: error.message });
    }
  };

  deletePayment = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      await this.paymentService.deletePayment(id);
      res.status(200).json({ message: 'Payment deleted successfully' });
    } catch (err) {
      const error = err as Error;
      res.status(400).json({ error: error.message });
    }
  };
}
