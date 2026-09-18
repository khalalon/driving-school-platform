/**
 * User Model
 * Single Responsibility: Define user data structure
 */

export enum UserRole {
  STUDENT = 'student',
  INSTRUCTOR = 'instructor',
  ADMIN = 'admin',
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  schoolId?: string; // For instructors
  createdAt: Date;
  updatedAt: Date;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: UserRole;
}

/** Réponse réelle de A1 / A2 (contrat) : une paire de jetons. `token` / `user` : anciens champs, retirés en 6.2. */
export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  token?: string;
  user?: User;
}
