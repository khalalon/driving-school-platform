import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service';
import { registerSchema, loginSchema, refreshTokenSchema } from '../validators/auth.validator';
import { AuthRequest } from '../middleware/auth.middleware';

export class AuthController {
  constructor(private readonly authService: AuthService) {}

  register = async (req: Request, res: Response): Promise<void> => {
    try {
      const { error, value } = registerSchema.validate(req.body);
      if (error) {
        res.status(400).json({ error: error.details[0].message });
        return;
      }

      const tokens = await this.authService.register(value);
      res.status(201).json(tokens);
    } catch (err) {
      const error = err as Error;
      res.status(400).json({ error: error.message });
    }
  };

  login = async (req: Request, res: Response): Promise<void> => {
    try {
      const { error, value } = loginSchema.validate(req.body);
      if (error) {
        res.status(400).json({ error: error.details[0].message });
        return;
      }

      const tokens = await this.authService.login(value);
      res.status(200).json(tokens);
    } catch (err) {
      const error = err as Error;
      res.status(401).json({ error: error.message });
    }
  };

  refresh = async (req: Request, res: Response): Promise<void> => {
    try {
      const { error, value } = refreshTokenSchema.validate(req.body);
      if (error) {
        res.status(400).json({ error: error.details[0].message });
        return;
      }

      const tokens = await this.authService.refreshToken(value.refreshToken);
      res.status(200).json(tokens);
    } catch (err) {
      const error = err as Error;
      res.status(401).json({ error: error.message });
    }
  };

  logout = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      await this.authService.logout(req.user.userId);
      res.status(200).json({ message: 'Logged out successfully' });
    } catch (err) {
      const error = err as Error;
      res.status(400).json({ error: error.message });
    }
  };

  getCurrentUser = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const user = await this.authService.getCurrentUser(req.user.userId);
      
      const { passwordHash, ...userWithoutPassword } = user;
      res.status(200).json(userWithoutPassword);
    } catch (err) {
      const error = err as Error;
      res.status(400).json({ error: error.message });
    }
  };
}
