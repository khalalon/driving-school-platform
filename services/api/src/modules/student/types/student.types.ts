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

export interface ExamEligibility {
  eligible: boolean;
  requiredLessons: number;
  completedLessons: number;
  reason?: string;
}

export interface StudentProfile {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  address: string | null;
  dateOfBirth: Date | null;
  licenseNumber: string | null;
  profilePhotoUrl: string | null;
  enrollmentDate: Date | null;
  emergencyContact: string | null;
  emergencyPhone: string | null;
  notes: string | null;
  totalLessons: number;
  completedLessons: number;
  totalExams: number;
  passedExams: number;
}

export interface LessonHistory {
  id: string;
  lessonId: string;
  lessonType: string;
  dateTime: Date;
  duration: number;
  instructorName: string | null;
  attended: boolean | null;
  feedback: string | null;
  rating: number | null;
  paid: boolean;
  amount: number | null;
  paymentDate: Date | null;
  paymentMethod: string | null;
}

export interface ExamHistory {
  id: string;
  examId: string;
  examType: string;
  dateTime: Date;
  result: string | null;
  score: number | null;
  notes: string | null;
  paid: boolean;
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
