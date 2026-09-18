import { AuthUser, UserRole } from '../../../types/auth';

export { UserRole };

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  firstName: string;
  lastName: string;
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

/** A2 : sans `role` (toujours `student`, 4.1) ; `schoolCode` arrive en 4.2 (D-17). */
export interface RegisterDTO {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface LoginDTO {
  email: string;
  password: string;
}

export interface RefreshTokenDTO {
  refreshToken: string;
}
