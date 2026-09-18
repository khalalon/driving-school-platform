import express, { Response } from 'express';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { TokenService } from '../../modules/auth/services/token.service';
import { UserRole } from '../../types/auth';
import { AuthRequest, authenticate, authorize } from '../auth.middleware';

describe('middleware/auth', () => {
  const secret = 'test-secret-key-for-jwt-tokens-0123456789';
  const tokenService = new TokenService({
    secret,
    accessTokenExpiry: '15m',
    refreshTokenExpiry: '7d',
  });
  const student = { userId: 'u-student', email: 's@x.io', role: UserRole.STUDENT };
  const instructor = { userId: 'u-instr', email: 'i@x.io', role: UserRole.INSTRUCTOR };

  const app = express();
  app.get('/me', authenticate(tokenService), (req: AuthRequest, res: Response) => {
    res.json(req.user);
  });
  app.get(
    '/instructors-only',
    authenticate(tokenService),
    authorize(UserRole.INSTRUCTOR, UserRole.ADMIN),
    (_req, res) => {
      res.json({ ok: true });
    }
  );
  app.get('/authorize-alone', authorize(UserRole.ADMIN), (_req, res) => {
    res.json({ ok: true });
  });

  const bearer = (payload: typeof student): string =>
    `Bearer ${tokenService.generateTokens(payload).accessToken}`;

  it('jeton valide : pose req.user = { userId, email, role } sans appel réseau', async () => {
    const res = await request(app).get('/me').set('Authorization', bearer(student));
    expect(res.status).toBe(200);
    expect(res.body).toEqual(student);
  });

  it('jeton absent : 401 UNAUTHORIZED « Jeton manquant »', async () => {
    const res = await request(app).get('/me');
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: 'UNAUTHORIZED', message: 'Jeton manquant' });
  });

  it('schéma autre que Bearer : 401', async () => {
    const res = await request(app).get('/me').set('Authorization', 'Basic abc');
    expect(res.status).toBe(401);
  });

  it('jeton expiré : 401 UNAUTHORIZED « Jeton invalide ou expiré »', async () => {
    const expired = jwt.sign(student, secret, { expiresIn: -10 });
    const res = await request(app).get('/me').set('Authorization', `Bearer ${expired}`);
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: 'UNAUTHORIZED', message: 'Jeton invalide ou expiré' });
  });

  it('jeton signé avec un autre secret : 401', async () => {
    const forged = jwt.sign(student, 'other-secret', { expiresIn: '15m' });
    const res = await request(app).get('/me').set('Authorization', `Bearer ${forged}`);
    expect(res.status).toBe(401);
  });

  it('mauvais rôle : 403 FORBIDDEN avec les rôles attendus', async () => {
    const res = await request(app).get('/instructors-only').set('Authorization', bearer(student));
    expect(res.status).toBe(403);
    expect(res.body).toEqual({
      error: 'FORBIDDEN',
      message: 'Accès réservé aux rôles : instructor, admin',
    });
  });

  it('bon rôle : passe', async () => {
    const res = await request(app)
      .get('/instructors-only')
      .set('Authorization', bearer(instructor));
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });

  it('authorize sans authenticate en amont : 401 plutôt qu’un plantage', async () => {
    const res = await request(app).get('/authorize-alone');
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: 'UNAUTHORIZED', message: 'Authentification requise' });
  });
});
