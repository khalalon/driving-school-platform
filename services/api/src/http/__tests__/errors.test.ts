import { Response } from 'express';
import { HttpError, sendCaughtError, sendError, sendValidationError } from '../errors';

function mockResponse(): { res: Response; status: jest.Mock; json: jest.Mock } {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  return { res: { status } as unknown as Response, status, json };
}

describe('http/errors', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('sendError produit { error, message } avec le statut demandé (D-27)', () => {
    const { res, status, json } = mockResponse();

    sendError(res, 404, 'NOT_FOUND', 'Leçon introuvable');

    expect(status).toHaveBeenCalledWith(404);
    expect(json).toHaveBeenCalledWith({ error: 'NOT_FOUND', message: 'Leçon introuvable' });
  });

  it('sendCaughtError relaie une HttpError telle quelle', () => {
    const { res, status, json } = mockResponse();

    sendCaughtError(res, new HttpError(403, 'FORBIDDEN_SCHOOL', 'Autre école'));

    expect(status).toHaveBeenCalledWith(403);
    expect(json).toHaveBeenCalledWith({ error: 'FORBIDDEN_SCHOOL', message: 'Autre école' });
  });

  it('sendCaughtError masque toute autre exception en 500 INTERNAL_ERROR et la journalise', () => {
    const { res, status, json } = mockResponse();
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);

    sendCaughtError(res, new Error('détail interne'));

    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith({
      error: 'INTERNAL_ERROR',
      message: 'Erreur interne du serveur',
    });
    expect(consoleError).toHaveBeenCalled();
  });

  it('sendValidationError répond 400 VALIDATION_ERROR avec le détail Joi', () => {
    const { res, status, json } = mockResponse();

    sendValidationError(res, '"email" must be a valid email');

    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith({
      error: 'VALIDATION_ERROR',
      message: 'Données invalides : "email" must be a valid email',
    });
  });
});
