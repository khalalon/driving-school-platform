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
 * Procédure d'examen selon le type (D-42). Théorie : l'école choisit la date (« Schedule » =
 * fixer un rendez-vous, « Reject » = l'école ne présente pas l'élève). Pratique : la date est
 * imposée par la session ATTT (« Record convocation » = enregistrer la date et le centre reçus,
 * « File not ready » = dossier pas prêt, l'élève redemandera à la session suivante). Mêmes
 * payloads (X3 `{ dateTime, location }`, X4 `{ reason }`) et mêmes statuts ; seuls les mots
 * changent. Pour inverser les procédures, échanger les deux entrées de `EXAM_PROCEDURES`.
 */
export interface ExamProcedureLabels {
  /** Bouton et titre de la modale X3. */
  scheduleAction: string;
  scheduleHint: string;
  dateLabel: string;
  locationLabel: string;
  locationPlaceholder: string;
  /** Bouton et titre de la modale X4. */
  rejectAction: string;
  rejectHint: string;
  /** Statuts vus par l'élève. */
  scheduledStatus: string;
  rejectedStatus: string;
  pendingHint: string;
  rejectedHint: string;
}

const SCHOOL_PROCEDURE: ExamProcedureLabels = {
  scheduleAction: 'Schedule',
  scheduleHint: 'Set the date, time and location of the exam',
  dateLabel: 'Exam date',
  locationLabel: 'Location',
  locationPlaceholder: 'e.g., Main Driving Center',
  rejectAction: 'Reject',
  rejectHint: 'Explain why the school will not present the student to this exam',
  scheduledStatus: 'Scheduled',
  rejectedStatus: 'Rejected',
  pendingHint: 'Waiting for the school to schedule your exam',
  rejectedHint: 'The school did not present you to this exam',
};

const ATTT_SESSION_PROCEDURE: ExamProcedureLabels = {
  scheduleAction: 'Record convocation',
  scheduleHint: 'Enter the session date and the exam center received from the ATTT',
  dateLabel: 'Session date (ATTT)',
  locationLabel: 'Exam center (ATTT)',
  locationPlaceholder: 'e.g., Centre ATTT Tunis',
  rejectAction: 'File not ready',
  rejectHint: 'Explain what is missing: the student can request again for the next session',
  scheduledStatus: 'Convocation received',
  rejectedStatus: 'File not ready',
  pendingHint: 'Waiting for the next ATTT session',
  rejectedHint: 'You can request again for the next session',
};

export const EXAM_PROCEDURES: Record<ExamType, ExamProcedureLabels> = {
  [ExamType.THEORY]: SCHOOL_PROCEDURE,
  [ExamType.PRACTICAL]: ATTT_SESSION_PROCEDURE,
};

/** Libellé de statut vu par l'élève, selon la procédure du type (D-42). */
export const examStatusLabel = (type: ExamType, status: ExamStatus): string => {
  const procedure = EXAM_PROCEDURES[type];
  if (status === ExamStatus.SCHEDULED) return procedure?.scheduledStatus ?? EXAM_STATUS_LABELS[status];
  if (status === ExamStatus.REJECTED) return procedure?.rejectedStatus ?? EXAM_STATUS_LABELS[status];
  return EXAM_STATUS_LABELS[status];
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

/** Filtres de X1 : `status` (une ou plusieurs valeurs). */
export interface ExamFilters {
  status?: ExamStatus[];
}
