/** Vocabulaire métier partagé : le backend fait foi (D-18), aligné sur les CHECK de la base. */
export enum LessonType {
  CODE = 'CODE',
  MANOEUVRE = 'Manœuvre',
  PARC = 'Parc',
}

export const LESSON_TYPES: readonly LessonType[] = Object.values(LessonType);

export type EnrollmentRequestStatus = 'pending' | 'approved' | 'rejected';
export const ENROLLMENT_REQUEST_STATUSES: readonly EnrollmentRequestStatus[] = [
  'pending',
  'approved',
  'rejected',
];
