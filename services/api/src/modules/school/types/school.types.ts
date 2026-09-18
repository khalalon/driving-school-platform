import { UserRole } from '../../../types/auth';
import { LessonType } from '../../../types/domain';

export interface School {
  id: string;
  name: string;
  address: string;
  phone: string;
  email: string;
  logoUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateSchoolDTO {
  name: string;
  address: string;
  phone: string;
  email: string;
  logoUrl?: string;
}

export interface UpdateSchoolDTO {
  name?: string;
  address?: string;
  phone?: string;
  email?: string;
  logoUrl?: string;
}

/**
 * `firstName` / `lastName` viennent de `users` (D-16, 3.1 ; vides sans compte lié).
 * `name` : dérivé (`users` puis repli `instructors.name`), transitoire pour le mobile actuel,
 * retiré du contrat S3 en 6.1.
 */
export interface Instructor {
  id: string;
  schoolId: string;
  userId: string | null;
  firstName: string;
  lastName: string;
  name: string | null;
  phone: string;
  licenseNumber: string;
  specialties: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateInstructorDTO {
  userId: string;
  /** Colonne héritée, nullable depuis 3.1 ; l'identité est celle de `users`. */
  name?: string;
  phone: string;
  licenseNumber: string;
  specialties: string[];
}

export interface UpdateInstructorDTO {
  name?: string;
  phone?: string;
  licenseNumber?: string;
  specialties?: string[];
}

export interface Pricing {
  id: string;
  schoolId: string;
  lessonType: LessonType;
  price: number;
  duration: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface SetPricingDTO {
  lessonType: LessonType;
  price: number;
  duration: number;
}

/** Code d'inscription d'une école (D-17) : `role` du compte créé, quota et expiration facultatifs. */
export interface SchoolCode {
  id: string;
  schoolId: string;
  code: string;
  role: UserRole.INSTRUCTOR | UserRole.STUDENT;
  maxUses: number | null;
  usesCount: number;
  expiresAt: Date | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
