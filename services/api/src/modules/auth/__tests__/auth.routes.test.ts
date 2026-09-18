import request from 'supertest';
import { createApp } from '../../../app';
import { HttpError } from '../../../http/errors';
import { AuthController } from '../controllers/auth.controller';
import { authenticate } from '../../../middleware/auth.middleware';
import { createAuthRouter } from '../routes/auth.routes';
import { AuthService } from '../services/auth.service';
import { TokenService } from '../services/token.service';
import { UserRole } from '../types/auth.types';

/**
 * Le module auth vu par HTTP : validation Joi, statuts, format d'erreur { error, message } (D-27),
 * middleware Bearer. AuthService est doublé ; TokenService est réel (jetons signés).
 */
describe('Routes /api/auth', () => {
  const tokenService = new TokenService({
    secret: 'test-secret-key-for-jwt-tokens-0123456789',
    accessTokenExpiry: '15m',
    refreshTokenExpiry: '7d',
  });
  const authService = {
    register: jest.fn(),
    login: jest.fn(),
    refreshToken: jest.fn(),
    logout: jest.fn(),
    getCurrentUser: jest.fn(),
  };
  const app = createApp({
    auth: createAuthRouter(
      new AuthController(authService as unknown as AuthService),
      authenticate(tokenService)
    ),
  });
  const tokens = { accessToken: 'a', refreshToken: 'r' };
  const registerBody = {
    email: 'x@x.io',
    password: 'Passw0rd!',
    firstName: 'Ali',
    lastName: 'Ben Salah',
  };
  const bearer = (): string =>
    `Bearer ${
      tokenService.generateTokens({ userId: 'u1', email: 'u@x.io', role: UserRole.STUDENT })
        .accessToken
    }`;

  beforeEach(() => jest.clearAllMocks());

  it('GET /health répond 200', async () => {
    await request(app).get('/health').expect(200, { status: 'ok' });
  });

  it('une route inconnue répond 404 NOT_FOUND au format D-27', async () => {
    const res = await request(app).get('/api/nowhere').expect(404);
    expect(res.body).toEqual({ error: 'NOT_FOUND', message: 'Route inconnue' });
  });

  it('POST /register : 400 VALIDATION_ERROR si le payload est incomplet', async () => {
    const res = await request(app).post('/api/auth/register').send({ email: 'x@x.io' });
    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({ error: 'VALIDATION_ERROR' });
    expect((res.body as { message: string }).message).toContain('password');
    expect(authService.register).not.toHaveBeenCalled();
  });

  it('POST /register : 400 VALIDATION_ERROR sans firstName / lastName (D-16)', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'x@x.io', password: 'Passw0rd!' });
    expect(res.status).toBe(400);
    expect((res.body as { message: string }).message).toContain('firstName');
    expect(authService.register).not.toHaveBeenCalled();
  });

  it('POST /register : 400 VALIDATION_ERROR si `role` est présent (4.1, jamais choisi par l’appelant)', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ ...registerBody, role: 'admin' });
    expect(res.status).toBe(400);
    expect((res.body as { message: string }).message).toContain('role');
    expect(authService.register).not.toHaveBeenCalled();
  });

  it('POST /register : 201 avec les jetons ; noms transmis épurés', async () => {
    authService.register.mockResolvedValue(tokens);
    const res = await request(app)
      .post('/api/auth/register')
      .send({ ...registerBody, firstName: '  Ali ' });
    expect(res.status).toBe(201);
    expect(res.body).toEqual(tokens);
    expect(authService.register).toHaveBeenCalledWith({ ...registerBody, firstName: 'Ali' });
  });

  it('POST /register : 409 CONFLICT relayé depuis le service', async () => {
    authService.register.mockRejectedValue(new HttpError(409, 'CONFLICT', 'Un compte existe déjà'));
    const res = await request(app).post('/api/auth/register').send(registerBody);
    expect(res.status).toBe(409);
    expect(res.body).toEqual({ error: 'CONFLICT', message: 'Un compte existe déjà' });
  });

  it('POST /login : 401 UNAUTHORIZED avec message pour de mauvais identifiants', async () => {
    authService.login.mockRejectedValue(
      new HttpError(401, 'UNAUTHORIZED', 'Identifiants invalides')
    );
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@x.io', password: 'x' });
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: 'UNAUTHORIZED', message: 'Identifiants invalides' });
  });

  it('POST /login : 500 INTERNAL_ERROR sans fuite du détail pour une erreur inattendue', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    authService.login.mockRejectedValue(new Error('pg: connection refused'));
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@x.io', password: 'x' });
    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: 'INTERNAL_ERROR', message: 'Erreur interne du serveur' });
    expect(consoleError).toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it('POST /refresh : 200 avec une nouvelle paire', async () => {
    authService.refreshToken.mockResolvedValue(tokens);
    const res = await request(app).post('/api/auth/refresh').send({ refreshToken: 'r' });
    expect(res.status).toBe(200);
    expect(authService.refreshToken).toHaveBeenCalledWith('r');
  });

  it('GET /me : 401 UNAUTHORIZED sans jeton, 401 avec un jeton invalide', async () => {
    const none = await request(app).get('/api/auth/me');
    expect(none.status).toBe(401);
    expect(none.body).toEqual({ error: 'UNAUTHORIZED', message: 'Jeton manquant' });

    const bad = await request(app).get('/api/auth/me').set('Authorization', 'Bearer nope');
    expect(bad.status).toBe(401);
    expect(bad.body).toEqual({ error: 'UNAUTHORIZED', message: 'Jeton invalide ou expiré' });
  });

  it("GET /me : 200 avec l'utilisateur du jeton", async () => {
    authService.getCurrentUser.mockResolvedValue({ id: 'u1', email: 'u@x.io', role: 'student' });
    const res = await request(app).get('/api/auth/me').set('Authorization', bearer());
    expect(res.status).toBe(200);
    expect(authService.getCurrentUser).toHaveBeenCalledWith('u1');
    expect(res.body).toEqual({ id: 'u1', email: 'u@x.io', role: 'student' });
  });

  it('POST /logout : 204 avec un jeton valide', async () => {
    authService.logout.mockResolvedValue(undefined);
    await request(app).post('/api/auth/logout').set('Authorization', bearer()).expect(204);
    expect(authService.logout).toHaveBeenCalledWith('u1');
  });
});
