import Joi from 'joi';
import {
  CreateEnrollmentRequestDTO,
  MarkPaidDTO,
  RejectEnrollmentRequestDTO,
  SetDocumentReceivedDTO,
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

// F7 : une pièce reçue ou non, avec une note facultative (ignorée si la pièce n'est pas reçue).
export const setDocumentReceivedSchema = Joi.object<SetDocumentReceivedDTO>({
  received: Joi.boolean().required(),
  note: Joi.string().trim().max(500).allow('').optional(),
});
