import Joi from 'joi';
import { ExamType, ExamResult } from '../types';

export const createExamSchema = Joi.object({
  schoolId: Joi.string().uuid().required(),
  type: Joi.string()
    .valid(...Object.values(ExamType))
    .required(),
  dateTime: Joi.date().iso().greater('now').required(),
  examinerId: Joi.string().uuid().optional(),
  price: Joi.number().positive().required(),
  capacity: Joi.number().integer().min(1).optional(),
});

export const updateExamSchema = Joi.object({
  dateTime: Joi.date().iso().greater('now').optional(),
  examinerId: Joi.string().uuid().optional(),
  price: Joi.number().positive().optional(),
  capacity: Joi.number().integer().min(1).optional(),
});

export const registerForExamSchema = Joi.object({
  studentId: Joi.string().uuid().required(),
});

export const recordResultSchema = Joi.object({
  result: Joi.string()
    .valid(...Object.values(ExamResult))
    .required(),
  score: Joi.number().integer().min(0).max(100).optional(),
  notes: Joi.string().max(1000).optional(),
});

export const examFiltersSchema = Joi.object({
  schoolId: Joi.string().uuid().optional(),
  type: Joi.string()
    .valid(...Object.values(ExamType))
    .optional(),
  dateFrom: Joi.date().iso().optional(),
  dateTo: Joi.date().iso().optional(),
});
