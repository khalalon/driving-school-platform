/**
 * Enrollment Models — objets du contrat §3 (E1–E6). Seule définition côté mobile : les
 * services l'importent, ils ne la dupliquent pas.
 */

export enum EnrollmentStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

/** `studentId` = users.id. `student*` joints pour E4, `school*` pour E3. */
export interface EnrollmentRequest {
  id: string;
  studentId: string;
  schoolId: string;
  status: EnrollmentStatus;
  message: string | null;
  rejectionReason: string | null;
  processedBy: string | null;
  processedAt: string | null;
  createdAt: string;
  updatedAt: string;
  schoolName?: string;
  schoolAddress?: string;
  studentEmail?: string;
  studentFirstName?: string;
  studentLastName?: string;
}

/** E1. */
export interface EnrollmentStatusInfo {
  isEnrolled: boolean;
  requestStatus?: EnrollmentStatus;
  enrollmentDate?: string | null;
  canBook: boolean;
}

/** E2 : `schoolId` va dans l'URL, `message` dans le corps. */
export interface CreateEnrollmentRequestData {
  schoolId: string;
  message?: string;
}
