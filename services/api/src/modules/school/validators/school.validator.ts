import Joi from 'joi';
import { LESSON_TYPES } from '../../../types/domain';
import {
  CreateInstructorDTO,
  CreateSchoolDTO,
  SetPricingDTO,
  UpdateInstructorDTO,
  UpdateSchoolDTO,
} from '../types/school.types';

const phone = Joi.string().pattern(/^\+?[0-9\s-()]+$/);

export const createSchoolSchema = Joi.object<CreateSchoolDTO>({
  name: Joi.string().min(2).max(255).required(),
  address: Joi.string().min(5).max(500).required(),
  phone: phone.required(),
  email: Joi.string().email().required(),
  logoUrl: Joi.string().uri().optional(),
});

export const updateSchoolSchema = Joi.object<UpdateSchoolDTO>({
  name: Joi.string().min(2).max(255).optional(),
  address: Joi.string().min(5).max(500).optional(),
  phone: phone.optional(),
  email: Joi.string().email().optional(),
  logoUrl: Joi.string().uri().optional(),
}).min(1);

export const createInstructorSchema = Joi.object<CreateInstructorDTO>({
  userId: Joi.string().uuid().required(),
  name: Joi.string().min(2).max(255).optional(),
  phone: phone.required(),
  licenseNumber: Joi.string().min(5).max(100).required(),
  specialties: Joi.array().items(Joi.string()).min(1).required(),
});

export const updateInstructorSchema = Joi.object<UpdateInstructorDTO>({
  name: Joi.string().min(2).max(255).optional(),
  phone: phone.optional(),
  licenseNumber: Joi.string().min(5).max(100).optional(),
  specialties: Joi.array().items(Joi.string()).min(1).optional(),
}).min(1);

// Vocabulaire D-18 : CODE / Manœuvre / Parc (contrainte CHECK de la table pricing).
export const setPricingSchema = Joi.object<SetPricingDTO>({
  lessonType: Joi.string()
    .valid(...LESSON_TYPES)
    .required(),
  price: Joi.number().positive().required(),
  duration: Joi.number().integer().positive().required(),
});
