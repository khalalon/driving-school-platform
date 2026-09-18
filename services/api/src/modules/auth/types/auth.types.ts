import { AuthUser, UserRole } from '../../../types/auth';

export { UserRole };

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}

/** Utilisateur tel qu'exposé par l'API (jamais le hash). */
export type PublicUser = Omit<User, 'passwordHash'>;

/** Contenu signé dans les jetons = identité posée sur req.user par le middleware. */
export type TokenPayload = AuthUser;

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface RegisterDTO {
  email: string;
  password: string;
  role: UserRole;
}

export interface LoginDTO {
  email: string;
  password: string;
}

export interface RefreshTokenDTO {
  refreshToken: string;
}
