/**
 * Enrollment Models
 * Single Responsibility: Define enrollment data structures
 */

export enum EnrollmentStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

export interface EnrollmentRequest {
  id: string;
  studentId: string;
  schoolId: string;
  status: EnrollmentStatus;
  message?: string;
  rejectionReason?: string;
  processedBy?: string;
  processedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  // Populated fields
  schoolName?: string;
  schoolAddress?: string;
  studentEmail?: string;
}

export interface EnrollmentStatusInfo {
  isEnrolled: boolean;
  requestStatus?: EnrollmentStatus;
  enrollmentDate?: Date;
  canBook: boolean;
}

export interface CreateEnrollmentRequestDto {
  schoolId: string;
  message?: string;
}
