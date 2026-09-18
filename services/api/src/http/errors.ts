import { Response } from 'express';

/**
 * Format d'erreur unique de l'API (D-27) : `{ error: <code stable>, message: <texte français> }`.
 * Les codes sont ceux de docs/API_CONTRACT.md (« Conventions transverses »).
 */
export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'FORBIDDEN_SCHOOL'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'NOT_ENROLLED'
  | 'CANCEL_WINDOW_CLOSED'
  | 'PRICE_REQUIRED'
  | 'INVALID_SCHOOL_CODE'
  | 'INTERNAL_ERROR';

export interface ErrorBody {
  error: ErrorCode;
  message: string;
}

/** Erreur métier portant son statut HTTP : levée par les services, traduite par les controllers. */
export class HttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: ErrorCode,
    message: string
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

export function sendError(res: Response, status: number, code: ErrorCode, message: string): void {
  const body: ErrorBody = { error: code, message };
  res.status(status).json(body);
}

/**
 * Réponse d'erreur d'un controller : une `HttpError` garde son statut et son code ; toute autre
 * exception devient un 500 générique (le détail part dans les journaux, pas au client).
 */
export function sendCaughtError(res: Response, err: unknown): void {
  if (err instanceof HttpError) {
    sendError(res, err.status, err.code, err.message);
    return;
  }
  console.error('Erreur non gérée :', err);
  sendError(res, 500, 'INTERNAL_ERROR', 'Erreur interne du serveur');
}

/** Erreur de validation Joi → 400 VALIDATION_ERROR avec le détail du premier champ fautif. */
export function sendValidationError(res: Response, detail: string): void {
  sendError(res, 400, 'VALIDATION_ERROR', `Données invalides : ${detail}`);
}
