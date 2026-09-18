import { randomUUID } from 'crypto';
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

/** Identité + session (`sid`) portées par un access token. */
export interface AccessTokenPayload extends TokenPayload {
  sid: string;
}

/** Identité, session et identifiant unique (`jti`) d'un refresh token. */
export interface RefreshTokenPayload extends AccessTokenPayload {
  jti: string;
}

/** Paire émise, avec ce qu'il faut pour enregistrer le refresh token (4.6). */
export interface IssuedTokens extends AuthTokens {
  sid: string;
  jti: string;
  refreshTtlSeconds: number;
}

export interface ITokenService {
  /** `sid` fourni : rotation dans une session existante ; absent : nouvelle session. */
  generateTokens(payload: TokenPayload, sid?: string): IssuedTokens;
  verifyAccessToken(token: string): AccessTokenPayload;
  verifyRefreshToken(token: string): RefreshTokenPayload;
}

/**
 * Deux JWT HS256 (D-12, D-23) : `accessToken` (1 h) et `refreshToken` (30 j), signés avec deux
 * secrets distincts et porteurs d'un claim `type`. Un refresh token n'est jamais accepté là où un
 * access token est attendu, et réciproquement — même si les secrets venaient à être identiques.
 * Les deux portent `sid` (session, = famille de refresh tokens) ; le refresh porte aussi `jti`.
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

  generateTokens(payload: TokenPayload, sid: string = randomUUID()): IssuedTokens {
    const claims = { userId: payload.userId, email: payload.email, role: payload.role, sid };
    const jti = randomUUID();
    const accessToken = jwt.sign({ ...claims, type: 'access' }, this.accessSecret, {
      expiresIn: this.accessTokenExpiry,
    });
    const refreshToken = jwt.sign({ ...claims, type: 'refresh' }, this.refreshSecret, {
      expiresIn: this.refreshTokenExpiry,
      jwtid: jti,
    });
    const { exp, iat } = jwt.decode(refreshToken) as { exp: number; iat: number };
    return { accessToken, refreshToken, sid, jti, refreshTtlSeconds: exp - iat };
  }

  verifyAccessToken(token: string): AccessTokenPayload {
    const decoded = this.verify(token, this.accessSecret, 'access');
    return { userId: decoded.userId, email: decoded.email, role: decoded.role, sid: decoded.sid };
  }

  verifyRefreshToken(token: string): RefreshTokenPayload {
    const decoded = this.verify(token, this.refreshSecret, 'refresh');
    if (typeof decoded.jti !== 'string') {
      throw new jwt.JsonWebTokenError('Refresh token sans identifiant (jti)');
    }
    return {
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role,
      sid: decoded.sid,
      jti: decoded.jti,
    };
  }

  private verify(token: string, secret: string, expectedType: TokenType): SignedClaims {
    const decoded = jwt.verify(token, secret);
    if (typeof decoded === 'string' || !isSignedClaims(decoded)) {
      throw new jwt.JsonWebTokenError('Payload de jeton inattendu');
    }
    if (decoded.type !== expectedType) {
      throw new jwt.JsonWebTokenError(`Jeton de type ${String(decoded.type)} refusé ici`);
    }
    return decoded;
  }
}

interface SignedClaims extends TokenPayload {
  sid: string;
  type?: unknown;
  jti?: unknown;
}

function isSignedClaims(value: object): value is SignedClaims {
  const candidate = value as Partial<SignedClaims>;
  return (
    typeof candidate.userId === 'string' &&
    typeof candidate.email === 'string' &&
    typeof candidate.role === 'string' &&
    typeof candidate.sid === 'string'
  );
}
