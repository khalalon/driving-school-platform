/**
 * User Model — identité de l'appelant (A3) et payloads A1 / A2 du contrat.
 */

export enum UserRole {
  STUDENT = 'student',
  INSTRUCTOR = 'instructor',
  ADMIN = 'admin',
}

/** Réponse de A3 (`/api/auth/me`) : `schoolId` et `instructorId` seulement pour un instructeur (D-19). */
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  createdAt?: string;
  schoolId?: string;
  instructorId?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

/**
 * Longueur minimale du mot de passe, telle que le backend l'exige (A2 : `Joi.string().min(8)`).
 * Les écrans d'inscription la contrôlent avant l'envoi : sinon l'élève reçoit un 400.
 */
export const PASSWORD_MIN_LENGTH = 8;

/**
 * A2 (D-17) : sans `schoolCode` → compte `student` ; avec un code valide → rôle du code,
 * `phone` et `licenseNumber` requis. Le champ `role` n'est plus accepté par le backend.
 */
export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  schoolCode?: string;
  phone?: string;
  licenseNumber?: string;
}

/** Réponse de A1 / A2 : une paire de jetons (D-12). */
export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
}
