import Joi from 'joi';
import { LoginDTO, RefreshTokenDTO, RegisterDTO, UserRole } from '../types/auth.types';

// A2 cible : { email, password, firstName, lastName, schoolCode? } sans `role` (tâches 4.1, 4.2).
export const registerSchema = Joi.object<RegisterDTO>({
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
  role: Joi.string()
    .valid(...Object.values(UserRole))
    .required(),
});

export const loginSchema = Joi.object<LoginDTO>({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

export const refreshTokenSchema = Joi.object<RefreshTokenDTO>({
  refreshToken: Joi.string().required(),
});
