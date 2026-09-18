import { Request, Response } from 'express';
import { sendCaughtError, sendError, sendValidationError } from '../../../http/errors';
import { validate } from '../../../http/validation';
import { AuthRequest } from '../middleware/auth.middleware';
import { AuthService } from '../services/auth.service';
import { loginSchema, refreshTokenSchema, registerSchema } from '../validators/auth.validator';

export class AuthController {
  constructor(private readonly authService: AuthService) {}

  register = async (req: Request, res: Response): Promise<void> => {
    const parsed = validate(registerSchema, req.body);
    if (!parsed.ok) {
      sendValidationError(res, parsed.detail);
      return;
    }
    try {
      const tokens = await this.authService.register(parsed.value);
      res.status(201).json(tokens);
    } catch (err) {
      sendCaughtError(res, err);
    }
  };

  login = async (req: Request, res: Response): Promise<void> => {
    const parsed = validate(loginSchema, req.body);
    if (!parsed.ok) {
      sendValidationError(res, parsed.detail);
      return;
    }
    try {
      const tokens = await this.authService.login(parsed.value);
      res.status(200).json(tokens);
    } catch (err) {
      sendCaughtError(res, err);
    }
  };

  refresh = async (req: Request, res: Response): Promise<void> => {
    const parsed = validate(refreshTokenSchema, req.body);
    if (!parsed.ok) {
      sendValidationError(res, parsed.detail);
      return;
    }
    try {
      const tokens = await this.authService.refreshToken(parsed.value.refreshToken);
      res.status(200).json(tokens);
    } catch (err) {
      sendCaughtError(res, err);
    }
  };

  logout = async (req: AuthRequest, res: Response): Promise<void> => {
    if (!req.user) {
      sendError(res, 401, 'UNAUTHORIZED', 'Authentification requise');
      return;
    }
    try {
      await this.authService.logout(req.user.userId);
      res.status(204).send();
    } catch (err) {
      sendCaughtError(res, err);
    }
  };

  getCurrentUser = async (req: AuthRequest, res: Response): Promise<void> => {
    if (!req.user) {
      sendError(res, 401, 'UNAUTHORIZED', 'Authentification requise');
      return;
    }
    try {
      const user = await this.authService.getCurrentUser(req.user.userId);
      res.status(200).json(user);
    } catch (err) {
      sendCaughtError(res, err);
    }
  };
}
