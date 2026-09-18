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

/** Colonne `name` : nullable puis supprimée en 3.1 (D-16) ; `firstName`/`lastName` via `users` ensuite. */
export interface Instructor {
  id: string;
  schoolId: string;
  userId: string | null;
  name: string;
  phone: string;
  licenseNumber: string;
  specialties: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateInstructorDTO {
  userId: string;
  name: string;
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
