import Joi from 'joi';
import { LoginDTO, RefreshTokenDTO, RegisterDTO, UserRole } from '../types/auth.types';

// A2 : prénom et nom exigés pour tous les rôles (D-16, 3.1). `role` disparaît en 4.1, `schoolCode` en 4.2.
export const registerSchema = Joi.object<RegisterDTO>({
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
  role: Joi.string()
    .valid(...Object.values(UserRole))
    .required(),
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
