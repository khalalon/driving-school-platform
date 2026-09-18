import jwt, { SignOptions } from 'jsonwebtoken';
import { AuthTokens, TokenPayload } from '../types/auth.types';

// Durée acceptée par jsonwebtoken (`15m`, `7d`, ou un nombre de secondes).
type TokenExpiry = SignOptions['expiresIn'];

export interface TokenServiceOptions {
  secret: string;
  accessTokenExpiry: string;
  refreshTokenExpiry: string;
}

export interface ITokenService {
  generateTokens(payload: TokenPayload): AuthTokens;
  verifyAccessToken(token: string): TokenPayload;
  verifyRefreshToken(token: string): TokenPayload;
}

/**
 * Même secret et même payload pour l'access et le refresh token : c'est l'état actuel,
 * corrigé en 4.4 (claim `type`, secrets distincts, durées D-23).
 */
export class TokenService implements ITokenService {
  private readonly secret: string;
  private readonly accessTokenExpiry: TokenExpiry;
  private readonly refreshTokenExpiry: TokenExpiry;

  constructor(options: TokenServiceOptions) {
    this.secret = options.secret;
    this.accessTokenExpiry = options.accessTokenExpiry as TokenExpiry;
    this.refreshTokenExpiry = options.refreshTokenExpiry as TokenExpiry;
  }

  generateTokens(payload: TokenPayload): AuthTokens {
    const claims = { userId: payload.userId, email: payload.email, role: payload.role };
    const accessToken = jwt.sign(claims, this.secret, { expiresIn: this.accessTokenExpiry });
    const refreshToken = jwt.sign(claims, this.secret, { expiresIn: this.refreshTokenExpiry });
    return { accessToken, refreshToken };
  }

  verifyAccessToken(token: string): TokenPayload {
    return this.verify(token);
  }

  verifyRefreshToken(token: string): TokenPayload {
    return this.verify(token);
  }

  private verify(token: string): TokenPayload {
    const decoded = jwt.verify(token, this.secret);
    if (typeof decoded === 'string' || !isTokenPayload(decoded)) {
      throw new jwt.JsonWebTokenError('Payload de jeton inattendu');
    }
    return { userId: decoded.userId, email: decoded.email, role: decoded.role };
  }
}

function isTokenPayload(value: object): value is TokenPayload {
  const candidate = value as Partial<TokenPayload>;
  return (
    typeof candidate.userId === 'string' &&
    typeof candidate.email === 'string' &&
    typeof candidate.role === 'string'
  );
}
