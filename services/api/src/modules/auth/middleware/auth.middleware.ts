import { NextFunction, Request, Response } from 'express';
import { sendError } from '../../../http/errors';
import { ITokenService } from '../services/token.service';
import { TokenPayload, UserRole } from '../types/auth.types';

// Copie locale au module auth, remplacée par src/middleware/auth.middleware.ts en 2.2.
export interface AuthRequest extends Request {
  user?: TokenPayload;
}

export class AuthMiddleware {
  constructor(private readonly tokenService: ITokenService) {}

  authenticate = (req: AuthRequest, res: Response, next: NextFunction): void => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      sendError(res, 401, 'UNAUTHORIZED', 'Jeton manquant');
      return;
    }

    try {
      req.user = this.tokenService.verifyAccessToken(authHeader.substring(7));
    } catch {
      sendError(res, 401, 'UNAUTHORIZED', 'Jeton invalide ou expiré');
      return;
    }
    next();
  };

  authorize = (...roles: UserRole[]) => {
    return (req: AuthRequest, res: Response, next: NextFunction): void => {
      if (!req.user) {
        sendError(res, 401, 'UNAUTHORIZED', 'Authentification requise');
        return;
      }
      if (!roles.includes(req.user.role)) {
        sendError(res, 403, 'FORBIDDEN', `Accès réservé aux rôles : ${roles.join(', ')}`);
        return;
      }
      next();
    };
  };
}
