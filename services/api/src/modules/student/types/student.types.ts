import { EnrollmentRequestStatus, LessonType } from '../../../types/domain';

/** Ligne `students` = un couple (users.id, école). `id` ≠ `users.id` (ARCHITECTURE §4). */
export interface Student {
  id: string;
  userId: string;
  schoolId: string;
  authorized: boolean;
  enrollmentRequestId: string | null;
  enrollmentDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
  email?: string;
}

/** S6 : ligne de la liste des élèves d'une école (D-25). */
export interface SchoolStudent {
  studentId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  enrollmentDate: Date | null;
  completedLessons: number;
}

export interface CreateStudentDTO {
  userId: string;
  schoolId: string;
  authorized: boolean;
  enrollmentRequestId?: string;
}

/** `studentId` = users.id (l'élève demandeur). */
export interface EnrollmentRequest {
  id: string;
  studentId: string;
  schoolId: string;
  status: EnrollmentRequestStatus;
  message: string | null;
  rejectionReason: string | null;
  processedBy: string | null;
  processedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  studentEmail?: string;
  studentFirstName?: string;
  studentLastName?: string;
  schoolName?: string;
  schoolAddress?: string;
}

export interface CreateEnrollmentRequestDTO {
  message?: string;
}

export interface RejectEnrollmentRequestDTO {
  reason: string;
}

export interface EnrollmentStatus {
  isEnrolled: boolean;
  requestStatus?: EnrollmentRequestStatus;
  enrollmentDate?: Date | null;
  canBook: boolean;
}

export interface StudentLessonStats {
  id: string;
  studentId: string;
  schoolId: string;
  completedLessons: number;
  completedTheoryLessons: number;
  completedPracticalLessons: number;
  lastLessonDate: Date | null;
  updatedAt: Date;
}

export interface LessonCompletedDTO {
  schoolId: string;
  lessonType: LessonType;
  attended: boolean;
}

/** P1 / P8 : `id` = users.id (D-28) ; compteurs sur les leçons et examens planifiés ou passés. */
export interface StudentProfile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  address: string | null;
  dateOfBirth: Date | null;
  licenseNumber: string | null;
  enrollmentDate: Date | null;
  emergencyContact: string | null;
  emergencyPhone: string | null;
  notes: string | null;
  totalLessons: number;
  completedLessons: number;
  totalExams: number;
  passedExams: number;
}

/** P2 / P9 : une ligne par leçon (`lessons`, 007), planifiée, passée ou annulée. */
export interface LessonHistory {
  id: string;
  type: LessonType;
  status: string;
  scheduledDate: Date | null;
  durationMinutes: number | null;
  instructorFirstName: string;
  instructorLastName: string;
  attended: boolean | null;
  feedback: string | null;
  rating: number | null;
  paid: boolean;
  price: number | null;
  amount: number | null;
  paymentDate: Date | null;
  paymentMethod: string | null;
}

/** P3 / P10 : une ligne par examen (`exams`, 008), planifié, passé ou annulé. */
export interface ExamHistory {
  id: string;
  type: string;
  status: string;
  dateTime: Date | null;
  location: string | null;
  result: string;
  score: number | null;
  notes: string | null;
  paid: boolean;
  price: number | null;
  amount: number | null;
  paymentDate: Date | null;
  paymentMethod: string | null;
}

export interface FinancialSummary {
  totalRevenue: number;
  totalPending: number;
  totalDue: number;
  lessonsRevenue: number;
  examsRevenue: number;
  lessonsPending: number;
  examsPending: number;
  lastPaymentDate: Date | null;
}

export interface UpdateNotesDTO {
  notes: string;
}

export interface MarkPaidDTO {
  amount: number;
  paymentMethod: string;
}
