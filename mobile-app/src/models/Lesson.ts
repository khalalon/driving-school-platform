/**
 * Lesson Models — objet `Lesson` du contrat (§4) et payloads L2, L4, L5, L6, L7.
 * Vocabulaire : le backend fait foi (D-18) ; les libellés d'affichage sont ici.
 * Les dates sont des chaînes ISO 8601 telles que reçues en JSON.
 */

export enum LessonType {
  CODE = 'CODE',
  MANOEUVRE = 'Manœuvre',
  PARC = 'Parc',
}

export const LESSON_TYPES: readonly LessonType[] = [
  LessonType.CODE,
  LessonType.MANOEUVRE,
  LessonType.PARC,
];

export const LESSON_TYPE_LABELS: Record<LessonType, string> = {
  [LessonType.CODE]: 'Code',
  [LessonType.MANOEUVRE]: 'Manœuvre',
  [LessonType.PARC]: 'Parc',
};

/** Cycle D-21 : la demande de l'élève (`pending`) est planifiée (`scheduled`) ou refusée. */
export enum LessonStatus {
  PENDING = 'pending',
  SCHEDULED = 'scheduled',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  REJECTED = 'rejected',
}

export const LESSON_STATUS_LABELS: Record<LessonStatus, string> = {
  [LessonStatus.PENDING]: 'Pending',
  [LessonStatus.SCHEDULED]: 'Scheduled',
  [LessonStatus.COMPLETED]: 'Completed',
  [LessonStatus.CANCELLED]: 'Cancelled',
  [LessonStatus.REJECTED]: 'Rejected',
};

/** Fenêtre d'annulation par l'élève (D-24) : jusqu'à 24 h avant `scheduledDate`. */
export const LESSON_CANCEL_HOURS = 24;

/** Identité jointe depuis `users` (D-16). */
export interface PersonSummary {
  id: string;
  firstName: string;
  lastName: string;
}

/**
 * Une leçon = un élève (D-34). `studentId` = users.id (D-28) ; `instructorId` = instructors.id,
 * `null` tant que la demande est `pending` (D-32) ; `preferredInstructorId` = préférence de
 * l'élève, facultative.
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
  requestedDate: string | null;
  scheduledDate: string | null;
  durationMinutes: number | null;
  price: number | null;
  capacity: number;
  currentBookings: number;
  notes: string | null;
  adminNotes: string | null;
  rejectionReason: string | null;
  cancellationReason: string | null;
  /** users.id de l'auteur de l'annulation. */
  cancelledBy: string | null;
  attended: boolean | null;
  feedback: string | null;
  rating: number | null;
  paid: boolean;
  amount: number | null;
  paymentDate: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * L'élève peut-il annuler cette leçon (D-24) ? `pending` : toujours ; `scheduled` : seulement si
 * `scheduledDate − now ≥ LESSON_CANCEL_HOURS`. Le contrôle serveur (403 `CANCEL_WINDOW_CLOSED`)
 * est la règle ; ceci ne sert qu'à masquer le bouton. Une leçon déjà payée s'annule comme les
 * autres tant que Q-17 n'est pas tranchée (comportement actuel du serveur).
 */
export const canStudentCancel = (lesson: Lesson, now: Date = new Date()): boolean => {
  if (lesson.status === LessonStatus.PENDING) return true;
  if (lesson.status !== LessonStatus.SCHEDULED || !lesson.scheduledDate) return false;
  const scheduled = new Date(lesson.scheduledDate).getTime();
  return scheduled - now.getTime() >= LESSON_CANCEL_HOURS * 60 * 60 * 1000;
};

/** L2 : demande de l'élève, adressée à l'école ; l'instructeur n'est qu'une préférence (D-32). */
export interface RequestLessonData {
  type: LessonType;
  /** Date souhaitée, ISO 8601, dans le futur (D-21). */
  requestedDate: string;
  preferredInstructorId?: string;
  notes?: string;
}

/** L5 : planification par l'instructeur qui approuve (prix requis seulement sans tarif, D-30). */
export interface ApproveLessonData {
  scheduledDate: string;
  durationMinutes: number;
  price?: number;
  adminNotes?: string;
}

/**
 * Approbation multiple (D-34, 6.7) : un appel L5 par demande, en séquence ; les échecs
 * (409 déjà traitée, 400 prix requis…) n'arrêtent pas les suivantes.
 */
export interface BatchApprovalResult {
  succeeded: Lesson[];
  failed: { lessonId: string; error: unknown }[];
}

/** L4 : leçon planifiée directement par l'instructeur pour un élève (`studentId` = users.id). */
export interface BookLessonForStudentData {
  studentId: string;
  type: LessonType;
  scheduledDate: string;
  durationMinutes: number;
  price?: number;
  notes?: string;
}

/** L7 : présence par identifiant de leçon. */
export interface MarkAttendanceData {
  attended: boolean;
  feedback?: string;
  rating?: number;
}

/**
 * Filtres de L1 : `status` (une ou plusieurs valeurs), `scope` (instructeur : `school` = file
 * `pending` de l'école, `mine` = ses leçons ; ignoré pour un élève), `date` = un jour `YYYY-MM-DD`.
 */
export interface LessonFilters {
  status?: LessonStatus[];
  scope?: 'school' | 'mine';
  date?: string;
}
