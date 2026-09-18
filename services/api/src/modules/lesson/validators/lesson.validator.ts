import Joi from 'joi';
import { LESSON_TYPES } from '../../../types/domain';
import {
  BookLessonDTO,
  CreateLessonDTO,
  LESSON_STATUSES,
  LessonFilters,
  MarkAttendanceDTO,
  UpdateLessonDTO,
} from '../types/lesson.types';

export const createLessonSchema = Joi.object<CreateLessonDTO>({
  schoolId: Joi.string().uuid().required(),
  instructorId: Joi.string().uuid().required(),
  type: Joi.string()
    .valid(...LESSON_TYPES)
    .required(),
  dateTime: Joi.date().iso().greater('now').required(),
  durationMinutes: Joi.number().integer().min(15).max(480).required(),
  capacity: Joi.number().integer().min(1).max(50).required(),
  price: Joi.number().positive().required(),
});

export const updateLessonSchema = Joi.object<UpdateLessonDTO>({
  instructorId: Joi.string().uuid().optional(),
  dateTime: Joi.date().iso().greater('now').optional(),
  durationMinutes: Joi.number().integer().min(15).max(480).optional(),
  capacity: Joi.number().integer().min(1).max(50).optional(),
  price: Joi.number().positive().optional(),
  status: Joi.string()
    .valid(...LESSON_STATUSES)
    .optional(),
}).min(1);

export const bookLessonSchema = Joi.object<BookLessonDTO>({
  studentId: Joi.string().uuid().required(),
});

export const markAttendanceSchema = Joi.object<MarkAttendanceDTO>({
  attended: Joi.boolean().required(),
  feedback: Joi.string().max(1000).optional(),
  rating: Joi.number().integer().min(1).max(5).optional(),
});

export const lessonFiltersSchema = Joi.object<LessonFilters>({
  schoolId: Joi.string().uuid().optional(),
  instructorId: Joi.string().uuid().optional(),
  studentId: Joi.string().uuid().optional(),
  type: Joi.string()
    .valid(...LESSON_TYPES)
    .optional(),
  status: Joi.string()
    .valid(...LESSON_STATUSES)
    .optional(),
  dateFrom: Joi.date().iso().optional(),
  dateTo: Joi.date().iso().optional(),
});
