import Joi from 'joi';
import { LoginDTO, RefreshTokenDTO, RegisterDTO } from '../types/auth.types';

// A2 (D-16, D-17) : prénom et nom exigés ; le rôle n'est jamais choisi par l'appelant (un champ
// `role` est refusé comme toute clé inconnue) ; avec `schoolCode`, `phone` et `licenseNumber`
// deviennent obligatoires (colonnes NOT NULL d'`instructors`).
const withSchoolCode = { is: Joi.exist(), then: Joi.required(), otherwise: Joi.optional() };

// Téléphone : chiffres, espaces, tirets, parenthèses et un « + » en tête (formats tunisiens
// et internationaux). Même règle pour le contact d'urgence.
const phonePattern = /^\+?[0-9\s-()]+$/;

export const registerSchema = Joi.object<RegisterDTO>({
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
  firstName: Joi.string().trim().min(1).max(100).required(),
  lastName: Joi.string().trim().min(1).max(100).required(),
  schoolCode: Joi.string().trim().min(1).max(20).optional(),
  phone: Joi.string().pattern(phonePattern).max(50).when('schoolCode', withSchoolCode),
  licenseNumber: Joi.string().trim().min(1).max(100).when('schoolCode', withSchoolCode),

  // Coordonnées facultatives portées par le compte (D-50) : jamais exigées, même avec un code.
  // `.raw()` : la valeur reste la chaîne ISO envoyée, pas un objet Date converti par Joi
  dateOfBirth: Joi.date().iso().less('now').raw().optional(),
  address: Joi.string().trim().min(1).max(500).optional(),
  emergencyContact: Joi.string().trim().min(1).max(255).optional(),
  emergencyPhone: Joi.string().pattern(phonePattern).max(50).optional(),
});

export const loginSchema = Joi.object<LoginDTO>({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

export const refreshTokenSchema = Joi.object<RefreshTokenDTO>({
  refreshToken: Joi.string().required(),
});
