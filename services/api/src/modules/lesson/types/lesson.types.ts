import { LessonType } from '../../../types/domain';

/** Cycle D-21 : la demande de l'élève (`pending`) est planifiée (`scheduled`) ou refusée. */
export enum LessonStatus {
  PENDING = 'pending',
  SCHEDULED = 'scheduled',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  REJECTED = 'rejected',
}

export const LESSON_STATUSES: readonly LessonStatus[] = Object.values(LessonStatus);

/** Identité jointe depuis `users` (D-16). */
export interface PersonSummary {
  id: string;
  firstName: string;
  lastName: string;
}

/**
 * Objet `Lesson` du contrat (§4). Une leçon = un élève (D-34) ; `studentId` = users.id (D-28,
 * `student` = identité de l'élève) ; `instructorId` = instructors.id, `null` tant que la demande
 * est `pending` (D-32), `instructor` = identité de l'instructeur.
 */
export interface Lesson {
  id: string;
  schoolId: string;
  studentId: string;
  student: PersonSummary;
  instructorId: string | null;
  instructor: PersonSummary | null;
  preferredInstructorId: string | null;
  type: LessonType;
  status: LessonStatus;
  requestedDate: Date | null;
  scheduledDate: Date | null;
  durationMinutes: number | null;
  price: number | null;
  capacity: number;
  currentBookings: number;
  notes: string | null;
  adminNotes: string | null;
  rejectionReason: string | null;
  cancellationReason: string | null;
  /** users.id de l'auteur de l'annulation (élève ou instructeur), pour Q-17. */
  cancelledBy: string | null;
  attended: boolean | null;
  feedback: string | null;
  rating: number | null;
  paid: boolean;
  amount: number | null;
  paymentDate: Date | null;
  paymentMethod: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/** L2 : demande de l'élève, adressée à l'école. */
export interface RequestLessonDTO {
  type: LessonType;
  requestedDate: Date;
  preferredInstructorId?: string;
  notes?: string;
}

/** Ce que le repository écrit pour une demande (élève et école résolus par le service). */
export interface NewLessonRequest extends RequestLessonDTO {
  /** students.id */
  studentRowId: string;
  schoolId: string;
}

/** L5 (5.3) : planification par l'instructeur qui approuve. */
export interface ApproveLessonDTO {
  scheduledDate: Date;
  durationMinutes: number;
  price?: number;
  adminNotes?: string;
}

/** L6 (5.3), motif 10–500 caractères (D-29). */
export interface RejectLessonDTO {
  reason: string;
}

/** L3 (5.3). */
export interface CancelLessonDTO {
  reason?: string;
}

/** L4 (5.4) : leçon planifiée directement par l'instructeur pour un élève inscrit. */
export interface BookForStudentDTO {
  studentId: string;
  type: LessonType;
  scheduledDate: Date;
  durationMinutes: number;
  price?: number;
  notes?: string;
}

/** Ce que le repository écrit à l'approbation (L5) : instructeur = l'appelant (D-32), prix figé (D-30). */
export interface LessonApproval {
  instructorId: string;
  scheduledDate: Date;
  durationMinutes: number;
  price: number;
  adminNotes?: string;
}

/** Ce que le repository écrit pour L4 : leçon directement planifiée par l'instructeur appelant. */
export interface NewScheduledLesson {
  schoolId: string;
  /** students.id */
  studentRowId: string;
  instructorId: string;
  type: LessonType;
  scheduledDate: Date;
  durationMinutes: number;
  price: number;
  notes?: string;
}

/** L7 : présence par identifiant de leçon (une leçon = un élève). */
export interface MarkAttendanceDTO {
  attended: boolean;
  feedback?: string;
  rating?: number;
}

/** Filtres de L1 : `status` (une ou plusieurs valeurs), `scope` (instructeur), `date` (jour). */
export interface LessonFilters {
  status?: LessonStatus[];
  scope?: 'school' | 'mine';
  date?: string;
}

/** Portée résolue par le service à partir de l'appelant, appliquée par le repository. */
export type LessonScope =
  | { kind: 'student'; studentRowId: string }
  | {
      kind: 'instructor';
      instructorId: string;
      schoolId: string;
      scope: 'school' | 'mine' | 'both';
    }
  | { kind: 'all' };
