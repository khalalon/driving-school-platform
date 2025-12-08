import { Request, Response, NextFunction } from 'express';
import { ITokenService } from '../services/token.service';
import { UserRole } from '../types';

export interface AuthRequest extends Request {
  user?: {
    userId: string;
    email: string;
    role: UserRole;
  };
}

export class AuthMiddleware {
  constructor(private readonly tokenService: ITokenService) {}

  authenticate = (req: AuthRequest, res: Response, next: NextFunction): void => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({ error: 'No token provided' });
        return;
      }

      const token = authHeader.substring(7);
      const payload = this.tokenService.verifyAccessToken(token);

      req.user = payload;
      next();
    } catch (error) {
      res.status(401).json({ error: 'Invalid or expired token' });
    }
  };

  authorize = (...roles: UserRole[]) => {
    return (req: AuthRequest, res: Response, next: NextFunction): void => {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      if (!roles.includes(req.user.role)) {
        res.status(403).json({ error: 'Forbidden' });
        return;
      }

      next();
    };
  };
}
