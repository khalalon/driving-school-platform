import jwt from 'jsonwebtoken';
import { UserRole } from '../../types/auth.types';
import { TokenService } from '../token.service';

describe('TokenService (D-12 : claim type, deux secrets, 1 h / 30 j)', () => {
  const accessSecret = 'test-access-secret-key-for-jwt-tokens-0123456789';
  const refreshSecret = 'test-refresh-secret-key-for-jwt-tokens-0123456789';
  const payload = { userId: 'user-1', email: 'user@example.com', role: UserRole.INSTRUCTOR };
  const service = new TokenService({
    accessSecret,
    refreshSecret,
    accessTokenExpiry: '1h',
    refreshTokenExpiry: '30d',
  });

  it('génère deux jetons distincts, vérifiables chacun par sa méthode, portant le payload + session', () => {
    const tokens = service.generateTokens(payload);

    expect(tokens.accessToken).not.toEqual(tokens.refreshToken);
    expect(tokens.sid).toMatch(/^[0-9a-f-]{36}$/);
    expect(tokens.jti).toMatch(/^[0-9a-f-]{36}$/);
    expect(tokens.refreshTtlSeconds).toBe(30 * 24 * 3600);
    expect(service.verifyAccessToken(tokens.accessToken)).toEqual({ ...payload, sid: tokens.sid });
    expect(service.verifyRefreshToken(tokens.refreshToken)).toEqual({
      ...payload,
      sid: tokens.sid,
      jti: tokens.jti,
    });
  });

  it('rotation : un sid fourni est conservé, le jti change à chaque émission (4.6)', () => {
    const first = service.generateTokens(payload);
    const second = service.generateTokens(payload, first.sid);

    expect(second.sid).toBe(first.sid);
    expect(second.jti).not.toBe(first.jti);
    expect(service.verifyRefreshToken(second.refreshToken).jti).toBe(second.jti);
  });

  it('claims : type access / refresh, durées 1 h et 30 j', () => {
    const tokens = service.generateTokens(payload);
    const access = jwt.decode(tokens.accessToken) as { type: string; iat: number; exp: number };
    const refresh = jwt.decode(tokens.refreshToken) as { type: string; iat: number; exp: number };

    expect(access.type).toBe('access');
    expect(refresh.type).toBe('refresh');
    expect(access.exp - access.iat).toBe(3600);
    expect(refresh.exp - refresh.iat).toBe(30 * 24 * 3600);
  });

  it('un refresh token est refusé comme access token, et réciproquement', () => {
    const tokens = service.generateTokens(payload);

    expect(() => service.verifyAccessToken(tokens.refreshToken)).toThrow(jwt.JsonWebTokenError);
    expect(() => service.verifyRefreshToken(tokens.accessToken)).toThrow(jwt.JsonWebTokenError);
  });

  it('le type est vérifié même avec le bon secret (jeton forgé sans type ou avec le mauvais)', () => {
    const noType = jwt.sign({ ...payload, sid: 's' }, accessSecret, { expiresIn: '1h' });
    const wrongType = jwt.sign({ ...payload, sid: 's', type: 'refresh' }, accessSecret, {
      expiresIn: '1h',
    });

    expect(() => service.verifyAccessToken(noType)).toThrow(/type undefined refusé/);
    expect(() => service.verifyAccessToken(wrongType)).toThrow(/type refresh refusé/);
  });

  it('rejette un jeton signé avec un autre secret', () => {
    const forged = jwt.sign({ ...payload, sid: 's', type: 'access' }, 'another-secret', {
      expiresIn: '1h',
    });

    expect(() => service.verifyAccessToken(forged)).toThrow(jwt.JsonWebTokenError);
  });

  it('rejette un jeton expiré', () => {
    const expired = jwt.sign({ ...payload, sid: 's', type: 'access' }, accessSecret, {
      expiresIn: -10,
    });

    expect(() => service.verifyAccessToken(expired)).toThrow(jwt.TokenExpiredError);
  });

  it('rejette un jeton valide dont le payload n’a pas la forme attendue (sans sid, sans jti)', () => {
    const odd = jwt.sign({ sub: 'x', type: 'access' }, accessSecret, { expiresIn: '1h' });
    const noSid = jwt.sign({ ...payload, type: 'access' }, accessSecret, { expiresIn: '1h' });
    const noJti = jwt.sign({ ...payload, sid: 's', type: 'refresh' }, refreshSecret, {
      expiresIn: '1h',
    });

    expect(() => service.verifyAccessToken(odd)).toThrow('Payload de jeton inattendu');
    expect(() => service.verifyAccessToken(noSid)).toThrow('Payload de jeton inattendu');
    expect(() => service.verifyRefreshToken(noJti)).toThrow('sans identifiant (jti)');
  });
});
