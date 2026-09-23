/**
 * Exam Models — objet `Exam` du contrat (§5) et payloads X2, X3, X4, X5.
 * Vocabulaire : le backend fait foi (D-18) ; les libellés d'affichage sont ici.
 * Les dates sont des chaînes ISO 8601 telles que reçues en JSON.
 */

import { t } from '../i18n';

export enum ExamType {
  THEORY = 'theory',
  PRACTICAL = 'practical',
}

export const EXAM_TYPES: readonly ExamType[] = [ExamType.THEORY, ExamType.PRACTICAL];

/** Libellé du type d'examen dans la langue courante (D-47). */
export const examTypeLabel = (type: ExamType): string =>
  ({
    [ExamType.THEORY]: t('exam.type.theory'),
    [ExamType.PRACTICAL]: t('exam.type.practical'),
  })[type] ?? type;

export enum ExamResult {
  PENDING = 'pending',
  PASSED = 'passed',
  FAILED = 'failed',
}

/** Libellé du résultat dans la langue courante. */
export const examResultLabel = (result: ExamResult | string): string =>
  ({
    [ExamResult.PENDING]: t('exam.result.pending'),
    [ExamResult.PASSED]: t('exam.result.passed'),
    [ExamResult.FAILED]: t('exam.result.failed'),
  })[result as ExamResult] ?? String(result);

/** Cycle D-01 / D-33 : demande (`pending`) planifiée, refusée (`rejected`), puis résultat (`completed`). */
export enum ExamStatus {
  PENDING = 'pending',
  SCHEDULED = 'scheduled',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  REJECTED = 'rejected',
}

/** Libellé de l'état d'examen, hors procédure (voir `examStatusLabel` pour la vue élève). */
export const examStatusText = (status: ExamStatus): string =>
  ({
    [ExamStatus.PENDING]: t('exam.status.pending'),
    [ExamStatus.SCHEDULED]: t('exam.status.scheduled'),
    [ExamStatus.COMPLETED]: t('exam.status.completed'),
    [ExamStatus.CANCELLED]: t('exam.status.cancelled'),
    [ExamStatus.REJECTED]: t('exam.status.rejected'),
  })[status] ?? status;

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

const schoolProcedure = (): ExamProcedureLabels => ({
  scheduleAction: t('exam.procedure.school.scheduleAction'),
  scheduleHint: t('exam.procedure.school.scheduleHint'),
  dateLabel: t('exam.procedure.school.dateLabel'),
  locationLabel: t('exam.procedure.school.locationLabel'),
  locationPlaceholder: t('exam.procedure.school.locationPlaceholder'),
  rejectAction: t('exam.procedure.school.rejectAction'),
  rejectHint: t('exam.procedure.school.rejectHint'),
  scheduledStatus: t('exam.procedure.school.scheduledStatus'),
  rejectedStatus: t('exam.procedure.school.rejectedStatus'),
  pendingHint: t('exam.procedure.school.pendingHint'),
  rejectedHint: t('exam.procedure.school.rejectedHint'),
});

const atttSessionProcedure = (): ExamProcedureLabels => ({
  scheduleAction: t('exam.procedure.attt.scheduleAction'),
  scheduleHint: t('exam.procedure.attt.scheduleHint'),
  dateLabel: t('exam.procedure.attt.dateLabel'),
  locationLabel: t('exam.procedure.attt.locationLabel'),
  locationPlaceholder: t('exam.procedure.attt.locationPlaceholder'),
  rejectAction: t('exam.procedure.attt.rejectAction'),
  rejectHint: t('exam.procedure.attt.rejectHint'),
  scheduledStatus: t('exam.procedure.attt.scheduledStatus'),
  rejectedStatus: t('exam.procedure.attt.rejectedStatus'),
  pendingHint: t('exam.procedure.attt.pendingHint'),
  rejectedHint: t('exam.procedure.attt.rejectedHint'),
});

/** Procédure du type, dans la langue courante (D-42, D-47). */
export const examProcedure = (type: ExamType): ExamProcedureLabels =>
  type === ExamType.PRACTICAL ? atttSessionProcedure() : schoolProcedure();

/** Libellé de statut vu par l'élève, selon la procédure du type (D-42). */
export const examStatusLabel = (type: ExamType, status: ExamStatus): string => {
  const procedure = examProcedure(type);
  if (status === ExamStatus.SCHEDULED) return procedure.scheduledStatus;
  if (status === ExamStatus.REJECTED) return procedure.rejectedStatus;
  return examStatusText(status);
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
