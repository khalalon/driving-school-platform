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

/**
 * Une leçon = un élève (D-34) ; `studentId` = students.id en base (users.id dans l'API à partir
 * de 5.2, D-28). `instructorId` est `null` tant que la demande est `pending` (D-32).
 */
export interface Lesson {
  id: string;
  schoolId: string;
  studentId: string;
  instructorId: string | null;
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

/** Table `lesson_bookings`, plus alimentée depuis 007 ; lue par les anciennes routes jusqu'en 5.2. */
export interface LessonBooking {
  id: string;
  lessonId: string;
  studentId: string;
  attended: boolean | null;
  feedback: string | null;
  rating: number | null;
  createdAt: Date;
}

/** L2 (5.2) : demande de l'élève, adressée à l'école. */
export interface RequestLessonDTO {
  type: LessonType;
  requestedDate: Date;
  preferredInstructorId?: string;
  notes?: string;
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

/** Ancienne route `POST /api/lessons/:lessonId/book` (jusqu'en 5.2) ; `studentId` = students.id. */
export interface BookLessonDTO {
  studentId: string;
}

/** L7 : présence par identifiant de leçon (une leçon = un élève). */
export interface MarkAttendanceDTO {
  attended: boolean;
  feedback?: string;
  rating?: number;
}

/**
 * Ancienne route `POST /api/lessons` (créneau créé par l'école), conservée jusqu'en 5.2 : depuis
 * 007 une leçon a toujours son élève, d'où `studentId` (students.id).
 */
export interface CreateLessonDTO {
  schoolId: string;
  studentId: string;
  instructorId: string;
  type: LessonType;
  scheduledDate: Date;
  durationMinutes: number;
  price: number;
}

/** Ancienne route `PUT /api/lessons/:id`, conservée jusqu'en 5.2. */
export interface UpdateLessonDTO {
  instructorId?: string;
  scheduledDate?: Date;
  durationMinutes?: number;
  price?: number;
  status?: LessonStatus;
}

/**
 * Filtres de L1 : `status` (une ou plusieurs valeurs), `scope` (instructeur), `date` (jour).
 * `schoolId`, `instructorId`, `studentId`, `type`, `dateFrom`, `dateTo` : ancienne liste publique,
 * conservés jusqu'en 5.2.
 */
export interface LessonFilters {
  status?: LessonStatus[];
  scope?: 'school' | 'mine';
  date?: string;
  schoolId?: string;
  instructorId?: string;
  studentId?: string;
  type?: LessonType;
  dateFrom?: Date;
  dateTo?: Date;
}
