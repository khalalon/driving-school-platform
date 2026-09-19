import Joi from 'joi';
import {
  CreateEnrollmentRequestDTO,
  MarkPaidDTO,
  RejectEnrollmentRequestDTO,
  UpdateNotesDTO,
} from '../types/student.types';

export const createEnrollmentRequestSchema = Joi.object<CreateEnrollmentRequestDTO>({
  message: Joi.string().max(500).optional(),
});

// Motif de refus : 10 à 500 caractères (D-29).
export const rejectEnrollmentRequestSchema = Joi.object<RejectEnrollmentRequestDTO>({
  reason: Joi.string().min(10).max(500).required(),
});

export const updateNotesSchema = Joi.object<UpdateNotesDTO>({
  notes: Joi.string().trim().min(1).max(5000).required(),
});

export const markPaidSchema = Joi.object<MarkPaidDTO>({
  amount: Joi.number().positive().required(),
  paymentMethod: Joi.string().trim().min(1).max(50).required(),
});
