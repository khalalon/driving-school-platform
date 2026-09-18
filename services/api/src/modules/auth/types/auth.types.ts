import { Queryable } from '../../../db/transaction';
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

/**
 * A2 (D-17) : sans `schoolCode` → compte `student` ; avec un code valide → rôle du code, `phone`
 * et `licenseNumber` exigés (ligne `instructors` si le rôle est instructor). Jamais de `role`.
 */
export interface RegisterDTO {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  schoolCode?: string;
  phone?: string;
  licenseNumber?: string;
}

/** Ce que l'inscription attend du module school : consommer un code (D-17). */
export interface SchoolCodeConsumer {
  consume(
    code: string,
    executor?: Queryable
  ): Promise<{ schoolId: string; role: UserRole.INSTRUCTOR | UserRole.STUDENT } | null>;
}

/** Ce que l'inscription attend du module school : créer la fiche instructeur. */
export interface InstructorCreator {
  create(
    schoolId: string,
    data: { userId: string; phone: string; licenseNumber: string; specialties: string[] },
    executor?: Queryable
  ): Promise<unknown>;
}

export interface LoginDTO {
  email: string;
  password: string;
}

export interface RefreshTokenDTO {
  refreshToken: string;
}
