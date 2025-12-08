import Joi from 'joi';
import { PaymentMethod, PaymentStatus, ReferenceType } from '../types';

export const createPaymentSchema = Joi.object({
  studentId: Joi.string().uuid().required(),
  referenceType: Joi.string()
    .valid(...Object.values(ReferenceType))
    .required(),
  referenceId: Joi.string().uuid().required(),
  amount: Joi.number().positive().required(),
  method: Joi.string()
    .valid(...Object.values(PaymentMethod))
    .required(),
  metadata: Joi.object().optional(),
});

export const confirmPaymentSchema = Joi.object({
  transactionId: Joi.string().required(),
});

export const refundPaymentSchema = Joi.object({
  reason: Joi.string().min(5).max(500).required(),
});

export const paymentFiltersSchema = Joi.object({
  studentId: Joi.string().uuid().optional(),
  status: Joi.string()
    .valid(...Object.values(PaymentStatus))
    .optional(),
  method: Joi.string()
    .valid(...Object.values(PaymentMethod))
    .optional(),
  referenceType: Joi.string()
    .valid(...Object.values(ReferenceType))
    .optional(),
  dateFrom: Joi.date().iso().optional(),
  dateTo: Joi.date().iso().optional(),
});
