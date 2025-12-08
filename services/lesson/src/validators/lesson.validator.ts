import Joi from 'joi';
import { LessonType, LessonStatus } from '../types';

export const createLessonSchema = Joi.object({
  schoolId: Joi.string().uuid().required(),
  instructorId: Joi.string().uuid().required(),
  type: Joi.string()
    .valid(...Object.values(LessonType))
    .required(),
  dateTime: Joi.date().iso().greater('now').required(),
  durationMinutes: Joi.number().integer().min(15).max(480).required(),
  capacity: Joi.number().integer().min(1).max(50).required(),
  price: Joi.number().positive().required(),
});

export const updateLessonSchema = Joi.object({
  instructorId: Joi.string().uuid().optional(),
  dateTime: Joi.date().iso().greater('now').optional(),
  durationMinutes: Joi.number().integer().min(15).max(480).optional(),
  capacity: Joi.number().integer().min(1).max(50).optional(),
  price: Joi.number().positive().optional(),
  status: Joi.string()
    .valid(...Object.values(LessonStatus))
    .optional(),
});

export const bookLessonSchema = Joi.object({
  studentId: Joi.string().uuid().required(),
});

export const markAttendanceSchema = Joi.object({
  attended: Joi.boolean().required(),
  feedback: Joi.string().max(1000).optional(),
  rating: Joi.number().integer().min(1).max(5).optional(),
});

export const lessonFiltersSchema = Joi.object({
  schoolId: Joi.string().uuid().optional(),
  instructorId: Joi.string().uuid().optional(),
  studentId: Joi.string().uuid().optional(),
  type: Joi.string()
    .valid(...Object.values(LessonType))
    .optional(),
  status: Joi.string()
    .valid(...Object.values(LessonStatus))
    .optional(),
  dateFrom: Joi.date().iso().optional(),
  dateTo: Joi.date().iso().optional(),
});
