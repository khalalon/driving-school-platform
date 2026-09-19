/**
 * School Models — objets du contrat §2 (S1–S4, S6). Seule définition côté mobile.
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

/** S6 : élève autorisé de l'école, `studentId` = users.id (D-25) ; réservé à l'instructeur de l'école. */
export interface SchoolStudent {
  studentId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  enrollmentDate: string | null;
  completedLessons: number;
}

/** S4 : grille tarifaire, un tarif par type de leçon (D-30). */
export interface SchoolPricing {
  id: string;
  schoolId: string;
  lessonType: LessonType;
  price: number;
  duration: number;
}
