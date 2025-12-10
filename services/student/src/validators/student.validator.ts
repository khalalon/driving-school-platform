import Joi from 'joi';

export const createEnrollmentRequestSchema = Joi.object({
  message: Joi.string().max(500).optional(),
});

export const rejectEnrollmentRequestSchema = Joi.object({
  reason: Joi.string().min(10).max(500).required(),
});

export const lessonCompletedSchema = Joi.object({
  schoolId: Joi.string().uuid().required(),
  lessonType: Joi.string().valid('CODE', 'MANOEUVRE', 'PARC').required(),
  attended: Joi.boolean().required(),
});
