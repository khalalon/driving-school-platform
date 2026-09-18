import Joi from 'joi';
import {
  ConfirmPaymentDTO,
  CreatePaymentDTO,
  PAYMENT_METHODS,
  PAYMENT_STATUSES,
  PaymentFilters,
  REFERENCE_TYPES,
  RefundPaymentDTO,
} from '../types/payment.types';

export const createPaymentSchema = Joi.object<CreatePaymentDTO>({
  studentId: Joi.string().uuid().required(),
  referenceType: Joi.string()
    .valid(...REFERENCE_TYPES)
    .required(),
  referenceId: Joi.string().uuid().required(),
  amount: Joi.number().positive().required(),
  method: Joi.string()
    .valid(...PAYMENT_METHODS)
    .required(),
  metadata: Joi.object().optional(),
});

export const confirmPaymentSchema = Joi.object<ConfirmPaymentDTO>({
  transactionId: Joi.string().required(),
});

export const refundPaymentSchema = Joi.object<RefundPaymentDTO>({
  reason: Joi.string().min(5).max(500).required(),
});

export const paymentFiltersSchema = Joi.object<PaymentFilters>({
  studentId: Joi.string().uuid().optional(),
  status: Joi.string()
    .valid(...PAYMENT_STATUSES)
    .optional(),
  method: Joi.string()
    .valid(...PAYMENT_METHODS)
    .optional(),
  referenceType: Joi.string()
    .valid(...REFERENCE_TYPES)
    .optional(),
  dateFrom: Joi.date().iso().optional(),
  dateTo: Joi.date().iso().optional(),
});
