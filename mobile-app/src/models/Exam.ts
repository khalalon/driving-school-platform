/**
 * Exam Models — objet `Exam` du contrat (§5) et payloads X2, X3, X4, X5.
 * Vocabulaire : le backend fait foi (D-18) ; les libellés d'affichage sont ici.
 * Les dates sont des chaînes ISO 8601 telles que reçues en JSON.
 */

export enum ExamType {
  THEORY = 'theory',
  PRACTICAL = 'practical',
}

export const EXAM_TYPES: readonly ExamType[] = [ExamType.THEORY, ExamType.PRACTICAL];

export const EXAM_TYPE_LABELS: Record<ExamType, string> = {
  [ExamType.THEORY]: 'Theory',
  [ExamType.PRACTICAL]: 'Practical',
};

export enum ExamResult {
  PENDING = 'pending',
  PASSED = 'passed',
  FAILED = 'failed',
}

export const EXAM_RESULT_LABELS: Record<ExamResult, string> = {
  [ExamResult.PENDING]: 'Pending',
  [ExamResult.PASSED]: 'Passed',
  [ExamResult.FAILED]: 'Failed',
};

/** Cycle D-01 / D-33 : demande (`pending`) planifiée, refusée (`rejected`), puis résultat (`completed`). */
export enum ExamStatus {
  PENDING = 'pending',
  SCHEDULED = 'scheduled',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  REJECTED = 'rejected',
}

export const EXAM_STATUS_LABELS: Record<ExamStatus, string> = {
  [ExamStatus.PENDING]: 'Pending',
  [ExamStatus.SCHEDULED]: 'Scheduled',
  [ExamStatus.COMPLETED]: 'Completed',
  [ExamStatus.CANCELLED]: 'Cancelled',
  [ExamStatus.REJECTED]: 'Rejected',
};

/**
 * Un examen = une demande d'un élève (`studentId` = users.id, D-28), sans instructeur attitré
 * (D-33). `dateTime` et `location` sont fixés à la planification (X3).
 */
export interface Exam {
  id: string;
  schoolId: string;
  studentId: string;
  studentFirstName: string;
  studentLastName: string;
  studentCompletedLessons: number;
  type: ExamType;
  status: ExamStatus;
  preferredDate: string | null;
  message: string | null;
  dateTime: string | null;
  location: string | null;
  result: ExamResult;
  score: number | null;
  notes: string | null;
  rejectionReason: string | null;
  paid: boolean;
  amount: number | null;
  paymentDate: string | null;
  createdAt: string;
  updatedAt: string;
}

/** X2 : demande de l'élève, adressée à l'école. */
export interface RequestExamData {
  examType: ExamType;
  /** Date souhaitée, ISO 8601, dans le futur. */
  preferredDate: string;
  message?: string;
}

/** X3. */
export interface ScheduleExamData {
  dateTime: string;
  location: string;
}

/** X5 : `score` facultatif (D-33 : seul le code donne une note). */
export interface RecordExamResultData {
  result: ExamResult.PASSED | ExamResult.FAILED;
  score?: number;
  notes?: string;
}
