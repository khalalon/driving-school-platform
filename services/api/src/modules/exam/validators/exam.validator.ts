import Joi from 'joi';
import {
  CreateExamDTO,
  EXAM_RESULTS,
  EXAM_TYPES,
  ExamFilters,
  RecordResultDTO,
  RegisterForExamDTO,
  UpdateExamDTO,
} from '../types/exam.types';

export const createExamSchema = Joi.object<CreateExamDTO>({
  schoolId: Joi.string().uuid().required(),
  type: Joi.string()
    .valid(...EXAM_TYPES)
    .required(),
  dateTime: Joi.date().iso().greater('now').required(),
  examinerId: Joi.string().uuid().optional(),
  price: Joi.number().positive().required(),
  capacity: Joi.number().integer().min(1).optional(),
});

export const updateExamSchema = Joi.object<UpdateExamDTO>({
  dateTime: Joi.date().iso().greater('now').optional(),
  examinerId: Joi.string().uuid().optional(),
  price: Joi.number().positive().optional(),
  capacity: Joi.number().integer().min(1).optional(),
}).min(1);

export const registerForExamSchema = Joi.object<RegisterForExamDTO>({
  studentId: Joi.string().uuid().required(),
});

export const recordResultSchema = Joi.object<RecordResultDTO>({
  result: Joi.string()
    .valid(...EXAM_RESULTS)
    .required(),
  score: Joi.number().integer().min(0).max(100).optional(),
  notes: Joi.string().max(1000).optional(),
});

export const examFiltersSchema = Joi.object<ExamFilters>({
  schoolId: Joi.string().uuid().optional(),
  type: Joi.string()
    .valid(...EXAM_TYPES)
    .optional(),
  dateFrom: Joi.date().iso().optional(),
  dateTo: Joi.date().iso().optional(),
});
