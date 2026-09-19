import { UserRole } from '../../../types/auth';
import { LessonType } from '../../../types/domain';

/** Devise d'une école à la création quand rien n'est fourni (D-43 : écoles pilotes tunisiennes). */
export const DEFAULT_CURRENCY = 'TND';

/** `currency` : code ISO 4217 (D-43) ; tous les montants de l'école sont dans cette devise. */
export interface School {
  id: string;
  name: string;
  address: string;
  phone: string;
  email: string;
  logoUrl: string | null;
  currency: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateSchoolDTO {
  name: string;
  address: string;
  phone: string;
  email: string;
  logoUrl?: string;
  currency?: string;
}

export interface UpdateSchoolDTO {
  name?: string;
  address?: string;
  phone?: string;
  email?: string;
  logoUrl?: string;
  currency?: string;
}

/**
 * `firstName` / `lastName` viennent de `users` (D-16, 3.1 ; vides sans compte lié). La colonne
 * héritée `instructors.name` n'est plus exposée (contrat S3, 6.1) ; elle reste écrite par les
 * routes admin du §8.
 */
export interface Instructor {
  id: string;
  schoolId: string;
  userId: string | null;
  firstName: string;
  lastName: string;
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

/** S6 : élève autorisé d'une école, `studentId` = users.id (D-25). */
export interface SchoolStudent {
  studentId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  enrollmentDate: Date | null;
  completedLessons: number;
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
