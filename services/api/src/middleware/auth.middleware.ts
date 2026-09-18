import { NextFunction, Request, RequestHandler, Response } from 'express';
import { HttpError, sendError } from '../http/errors';
import { AuthUser, UserRole } from '../types/auth';

export interface AuthRequest extends Request {
  user?: AuthUser;
}

/** Ce que le middleware attend du module auth : vérifier localement un access token (D-03). */
export interface AccessTokenVerifier {
  verifyAccessToken(token: string): AuthUser;
}

/**
 * Vérifie `Authorization: Bearer <accessToken>` avec le secret partagé et pose
 * `req.user = { userId, email, role }`. Aucun appel réseau vers le module auth : la copie du
 * middleware qui interrogeait le service auth à chaque requête disparaît (ARCHITECTURE §3).
 */
export function authenticate(verifier: AccessTokenVerifier): RequestHandler {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      sendError(res, 401, 'UNAUTHORIZED', 'Jeton manquant');
      return;
    }
    try {
      req.user = verifier.verifyAccessToken(header.substring('Bearer '.length));
    } catch {
      sendError(res, 401, 'UNAUTHORIZED', 'Jeton invalide ou expiré');
      return;
    }
    next();
  };
}

/** À placer après `authenticate` : 403 FORBIDDEN si le rôle de l'appelant n'est pas dans la liste. */
export function authorize(...roles: UserRole[]): RequestHandler {
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
}

/**
 * Identité de l'appelant dans un controller placé derrière `authenticate`. Lève une HttpError 401
 * si le middleware n'a pas été posé (erreur de câblage), plutôt qu'un `req.user!`.
 */
export function getAuthUser(req: AuthRequest): AuthUser {
  if (!req.user) {
    throw new HttpError(401, 'UNAUTHORIZED', 'Authentification requise');
  }
  return req.user;
}
