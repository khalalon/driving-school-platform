import jwt from 'jsonwebtoken';
import { TokenPayload, AuthTokens } from '../types';

export interface ITokenService {
  generateTokens(payload: TokenPayload): AuthTokens;
  verifyAccessToken(token: string): TokenPayload;
  verifyRefreshToken(token: string): TokenPayload;
}

export class TokenService implements ITokenService {
  private readonly jwtSecret: string;
  private readonly accessTokenExpiry: string;
  private readonly refreshTokenExpiry: string;

  constructor() {
    this.jwtSecret = process.env.JWT_SECRET || 'fallback-secret-change-me';
    this.accessTokenExpiry = process.env.JWT_EXPIRES_IN || '15m';
    this.refreshTokenExpiry = process.env.JWT_REFRESH_EXPIRES_IN || '7d';
  }

  generateTokens(payload: TokenPayload): AuthTokens {
    const accessToken = jwt.sign(payload, this.jwtSecret, {
      expiresIn: this.accessTokenExpiry,
    });

    const refreshToken = jwt.sign(payload, this.jwtSecret, {
      expiresIn: this.refreshTokenExpiry,
    });

    return { accessToken, refreshToken };
  }

  verifyAccessToken(token: string): TokenPayload {
    return jwt.verify(token, this.jwtSecret) as TokenPayload;
  }

  verifyRefreshToken(token: string): TokenPayload {
    return jwt.verify(token, this.jwtSecret) as TokenPayload;
  }
}
