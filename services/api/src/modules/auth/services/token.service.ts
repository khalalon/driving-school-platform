import jwt, { SignOptions } from 'jsonwebtoken';
import { AuthTokens, TokenPayload } from '../types/auth.types';

// Durée acceptée par jsonwebtoken (`1h`, `30d`, ou un nombre de secondes).
type TokenExpiry = SignOptions['expiresIn'];

export type TokenType = 'access' | 'refresh';

export interface TokenServiceOptions {
  accessSecret: string;
  refreshSecret: string;
  accessTokenExpiry: string;
  refreshTokenExpiry: string;
}

export interface ITokenService {
  generateTokens(payload: TokenPayload): AuthTokens;
  verifyAccessToken(token: string): TokenPayload;
  verifyRefreshToken(token: string): TokenPayload;
}

/**
 * Deux JWT HS256 (D-12, D-23) : `accessToken` (1 h) et `refreshToken` (30 j), signés avec deux
 * secrets distincts et porteurs d'un claim `type`. Un refresh token n'est jamais accepté là où un
 * access token est attendu, et réciproquement — même si les secrets venaient à être identiques.
 */
export class TokenService implements ITokenService {
  private readonly accessSecret: string;
  private readonly refreshSecret: string;
  private readonly accessTokenExpiry: TokenExpiry;
  private readonly refreshTokenExpiry: TokenExpiry;

  constructor(options: TokenServiceOptions) {
    this.accessSecret = options.accessSecret;
    this.refreshSecret = options.refreshSecret;
    this.accessTokenExpiry = options.accessTokenExpiry as TokenExpiry;
    this.refreshTokenExpiry = options.refreshTokenExpiry as TokenExpiry;
  }

  generateTokens(payload: TokenPayload): AuthTokens {
    const claims = { userId: payload.userId, email: payload.email, role: payload.role };
    const accessToken = jwt.sign({ ...claims, type: 'access' }, this.accessSecret, {
      expiresIn: this.accessTokenExpiry,
    });
    const refreshToken = jwt.sign({ ...claims, type: 'refresh' }, this.refreshSecret, {
      expiresIn: this.refreshTokenExpiry,
    });
    return { accessToken, refreshToken };
  }

  verifyAccessToken(token: string): TokenPayload {
    return this.verify(token, this.accessSecret, 'access');
  }

  verifyRefreshToken(token: string): TokenPayload {
    return this.verify(token, this.refreshSecret, 'refresh');
  }

  private verify(token: string, secret: string, expectedType: TokenType): TokenPayload {
    const decoded = jwt.verify(token, secret);
    if (typeof decoded === 'string' || !isTokenPayload(decoded)) {
      throw new jwt.JsonWebTokenError('Payload de jeton inattendu');
    }
    if (decoded.type !== expectedType) {
      throw new jwt.JsonWebTokenError(`Jeton de type ${String(decoded.type)} refusé ici`);
    }
    return { userId: decoded.userId, email: decoded.email, role: decoded.role };
  }
}

function isTokenPayload(value: object): value is TokenPayload & { type?: unknown } {
  const candidate = value as Partial<TokenPayload>;
  return (
    typeof candidate.userId === 'string' &&
    typeof candidate.email === 'string' &&
    typeof candidate.role === 'string'
  );
}
