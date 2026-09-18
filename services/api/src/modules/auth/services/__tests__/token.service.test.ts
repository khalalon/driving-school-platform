import jwt from 'jsonwebtoken';
import { UserRole } from '../../types/auth.types';
import { TokenService } from '../token.service';

describe('TokenService', () => {
  const secret = 'test-secret-key-for-jwt-tokens-0123456789';
  const payload = { userId: 'user-1', email: 'user@example.com', role: UserRole.INSTRUCTOR };
  const service = new TokenService({
    secret,
    accessTokenExpiry: '15m',
    refreshTokenExpiry: '7d',
  });

  it('génère deux jetons distincts, vérifiables, portant le payload', () => {
    const tokens = service.generateTokens(payload);

    expect(tokens.accessToken).not.toEqual(tokens.refreshToken);
    expect(service.verifyAccessToken(tokens.accessToken)).toEqual(payload);
    expect(service.verifyRefreshToken(tokens.refreshToken)).toEqual(payload);
  });

  it('rejette un jeton signé avec un autre secret', () => {
    const forged = jwt.sign(payload, 'another-secret', { expiresIn: '15m' });

    expect(() => service.verifyAccessToken(forged)).toThrow(jwt.JsonWebTokenError);
  });

  it('rejette un jeton expiré', () => {
    const expired = jwt.sign(payload, secret, { expiresIn: -10 });

    expect(() => service.verifyAccessToken(expired)).toThrow(jwt.TokenExpiredError);
  });

  it('rejette un jeton valide dont le payload n’a pas la forme attendue', () => {
    const odd = jwt.sign({ sub: 'x' }, secret, { expiresIn: '15m' });

    expect(() => service.verifyAccessToken(odd)).toThrow('Payload de jeton inattendu');
  });
});
