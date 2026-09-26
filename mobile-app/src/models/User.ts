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
 * Coordonnées facultatives portées par le compte (D-50, 12.1) : saisies à l'inscription, elles
 * sont recopiées dans la fiche élève quand une école approuve. Un champ vide n'est pas envoyé.
 */
export interface ContactDetails {
  phone?: string;
  /** Date ISO `YYYY-MM-DD`, jamais dans le futur (refusée par le serveur sinon). */
  dateOfBirth?: string;
  address?: string;
  emergencyContact?: string;
  emergencyPhone?: string;
}

/**
 * A2 (D-17) : sans `schoolCode` → compte `student` ; avec un code valide → rôle du code,
 * `phone` et `licenseNumber` requis. Le champ `role` n'est plus accepté par le backend.
 * Les coordonnées (D-50) sont facultatives dans les deux cas.
 */
export interface RegisterRequest extends ContactDetails {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  schoolCode?: string;
  licenseNumber?: string;
}

/** Jour au format attendu par A2 (`YYYY-MM-DD`), en heure locale — pas en UTC. */
export const toIsoDay = (date: Date): string => {
  const pad = (value: number): string => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

/** Réponse de A1 / A2 : une paire de jetons (D-12). */
export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
}
