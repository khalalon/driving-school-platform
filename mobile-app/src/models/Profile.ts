/**
 * Profile Models — fiche élève du contrat §6, partagée par la vue instructeur (P1–P7) et la
 * vue élève (P8–P11). `id` = users.id (D-28). Les dates sont des chaînes ISO 8601.
 */

import { LessonType } from './Lesson';

/** P1 : fiche complète ; `notes` = note privée de l'instructeur, absente de P8. */
export interface StudentProfile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  address: string | null;
  dateOfBirth: string | null;
  licenseNumber: string | null;
  enrollmentDate: string | null;
  emergencyContact: string | null;
  emergencyPhone: string | null;
  notes?: string | null;
  totalLessons: number;
  completedLessons: number;
  totalExams: number;
  passedExams: number;
}

/** P8 : la même fiche sans la note privée. */
export type MyProfile = Omit<StudentProfile, 'notes'>;

/** P2 / P9 : une ligne par leçon planifiée, passée ou annulée ; `id` = lessons.id. */
export interface LessonHistory {
  id: string;
  type: LessonType;
  status: string;
  scheduledDate: string | null;
  durationMinutes: number | null;
  instructorFirstName: string;
  instructorLastName: string;
  attended: boolean | null;
  feedback: string | null;
  rating: number | null;
  paid: boolean;
  price: number | null;
  amount: number | null;
  paymentDate: string | null;
  paymentMethod: string | null;
}

/** P3 / P10 : une ligne par examen planifié, passé ou annulé ; `id` = exams.id. */
export interface ExamHistory {
  id: string;
  type: string;
  status: string;
  dateTime: string | null;
  location: string | null;
  result: string;
  score: number | null;
  notes: string | null;
  paid: boolean;
  price: number | null;
  amount: number | null;
  paymentDate: string | null;
  paymentMethod: string | null;
}

/** P4 / P11. */
export interface FinancialSummary {
  totalRevenue: number;
  totalPending: number;
  totalDue: number;
  lessonsRevenue: number;
  examsRevenue: number;
  lessonsPending: number;
  examsPending: number;
  lastPaymentDate: string | null;
}

/** P6 / P7. */
export type PaymentMethod = 'cash' | 'card' | 'bank_transfer';

export const PAYMENT_METHODS: readonly PaymentMethod[] = ['cash', 'card', 'bank_transfer'];

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: 'Cash',
  card: 'Card',
  bank_transfer: 'Bank transfer',
};
