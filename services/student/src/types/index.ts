export interface Student {
  id: string;
  userId: string;
  schoolId: string;
  authorized: boolean;
  enrollmentRequestId?: string;
  enrollmentDate?: Date;
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

export interface EnrollmentRequest {
  id: string;
  studentId: string;
  schoolId: string;
  status: 'pending' | 'approved' | 'rejected';
  message?: string;
  rejectionReason?: string;
  processedBy?: string;
  processedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  studentEmail?: string;
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
  requestStatus?: 'pending' | 'approved' | 'rejected';
  enrollmentDate?: Date;
  canBook: boolean;
}

export interface StudentLessonStats {
  id: string;
  studentId: string;
  schoolId: string;
  completedLessons: number;
  completedTheoryLessons: number;
  completedPracticalLessons: number;
  lastLessonDate?: Date;
  updatedAt: Date;
}

export interface LessonCompletedDTO {
  schoolId: string;
  lessonType: 'CODE' | 'MANOEUVRE' | 'PARC';
  attended: boolean;
}

export interface ExamEligibility {
  eligible: boolean;
  requiredLessons: number;
  completedLessons: number;
  reason?: string;
}

export interface AuthUser {
  userId: string;
  email: string;
  role: string;
}

export interface StudentProfile {
  // Basic Info
  id: string;
  userId: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  dateOfBirth?: Date;
  licenseNumber?: string;
  profilePhotoUrl?: string;
  enrollmentDate?: Date;
  
  // Emergency Contact
  emergencyContact?: string;
  emergencyPhone?: string;
  
  // Stats
  totalLessons: number;
  completedLessons: number;
  totalExams: number;
  passedExams: number;
  
  // Instructor Notes
  notes?: string;
}

export interface LessonHistory {
  id: string;
  lessonId: string;
  lessonType: string;
  dateTime: Date;
  duration: number;
  instructorName: string;
  attended?: boolean;
  feedback?: string;
  rating?: number;
  paid: boolean;
  amount?: number;
  paymentDate?: Date;
  paymentMethod?: string;
}

export interface ExamHistory {
  id: string;
  examId: string;
  examType: string;
  dateTime: Date;
  result?: string;
  score?: number;
  notes?: string;
  paid: boolean;
  amount?: number;
  paymentDate?: Date;
  paymentMethod?: string;
}

export interface FinancialSummary {
  totalRevenue: number;      // Total paid
  totalPending: number;      // Total unpaid
  totalDue: number;          // Amount owed
  lessonsRevenue: number;    // Paid lessons
  examsRevenue: number;      // Paid exams
  lessonsPending: number;    // Unpaid lessons
  examsPending: number;      // Unpaid exams
  lastPaymentDate?: Date;
}

export interface UpdateNotesDTO {
  notes: string;
}

export interface MarkPaidDTO {
  amount: number;
  paymentMethod: string;
}