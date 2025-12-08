import Joi from 'joi';
import { LessonType } from '../types';

export const createSchoolSchema = Joi.object({
  name: Joi.string().min(2).max(255).required(),
  address: Joi.string().min(5).max(500).required(),
  phone: Joi.string()
    .pattern(/^\+?[0-9\s-()]+$/)
    .required(),
  email: Joi.string().email().required(),
  logoUrl: Joi.string().uri().optional(),
});

export const updateSchoolSchema = Joi.object({
  name: Joi.string().min(2).max(255).optional(),
  address: Joi.string().min(5).max(500).optional(),
  phone: Joi.string()
    .pattern(/^\+?[0-9\s-()]+$/)
    .optional(),
  email: Joi.string().email().optional(),
  logoUrl: Joi.string().uri().optional(),
});

export const createInstructorSchema = Joi.object({
  userId: Joi.string().uuid().required(),
  name: Joi.string().min(2).max(255).required(),
  phone: Joi.string()
    .pattern(/^\+?[0-9\s-()]+$/)
    .required(),
  licenseNumber: Joi.string().min(5).max(100).required(),
  specialties: Joi.array().items(Joi.string()).min(1).required(),
});

export const updateInstructorSchema = Joi.object({
  name: Joi.string().min(2).max(255).optional(),
  phone: Joi.string()
    .pattern(/^\+?[0-9\s-()]+$/)
    .optional(),
  licenseNumber: Joi.string().min(5).max(100).optional(),
  specialties: Joi.array().items(Joi.string()).min(1).optional(),
});

export const setPricingSchema = Joi.object({
  lessonType: Joi.string()
    .valid(...Object.values(LessonType))
    .required(),
  price: Joi.number().positive().required(),
  duration: Joi.number().positive().required(),
});
