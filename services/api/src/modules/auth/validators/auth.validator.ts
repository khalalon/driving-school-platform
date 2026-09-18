import Joi from 'joi';
import { LoginDTO, RefreshTokenDTO, RegisterDTO } from '../types/auth.types';

// A2 : prénom et nom exigés (D-16). Le rôle n'est jamais choisi par l'appelant (4.1) : un champ
// `role` est refusé comme toute clé inconnue. `schoolCode` en 4.2.
export const registerSchema = Joi.object<RegisterDTO>({
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
  firstName: Joi.string().trim().min(1).max(100).required(),
  lastName: Joi.string().trim().min(1).max(100).required(),
});

export const loginSchema = Joi.object<LoginDTO>({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

export const refreshTokenSchema = Joi.object<RefreshTokenDTO>({
  refreshToken: Joi.string().required(),
});
