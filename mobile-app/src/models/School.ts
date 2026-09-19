/**
 * School Models — objets du contrat §2 (S1–S4). Seule définition côté mobile.
 */

import { LessonType } from './Lesson';

export interface School {
  id: string;
  name: string;
  address: string;
  phone: string;
  email: string;
  logoUrl: string | null;
  createdAt: string;
}

/** S3 : `id` = instructors.id (réutilisé comme `preferredInstructorId` dans L2) ; identité par `users` (D-16). */
export interface SchoolInstructor {
  id: string;
  userId: string | null;
  schoolId: string;
  firstName: string;
  lastName: string;
  phone: string;
  licenseNumber: string;
  specialties: string[];
}

/** S4 : grille tarifaire, un tarif par type de leçon (D-30). */
export interface SchoolPricing {
  id: string;
  schoolId: string;
  lessonType: LessonType;
  price: number;
  duration: number;
}
