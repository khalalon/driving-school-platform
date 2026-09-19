/** Vocabulaire D-18 : `theory` / `practical` ; résultats `pending` / `passed` / `failed`. */
export enum ExamType {
  THEORY = 'theory',
  PRACTICAL = 'practical',
}

export enum ExamResult {
  PENDING = 'pending',
  PASSED = 'passed',
  FAILED = 'failed',
}

/** Cycle D-01 / D-33 : demande (`pending`) planifiée, refusée, puis résultat (`completed`). */
export enum ExamStatus {
  PENDING = 'pending',
  SCHEDULED = 'scheduled',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  REJECTED = 'rejected',
}

export const EXAM_TYPES: readonly ExamType[] = Object.values(ExamType);
export const EXAM_RESULTS: readonly ExamResult[] = Object.values(ExamResult);
export const EXAM_STATUSES: readonly ExamStatus[] = Object.values(ExamStatus);

/**
 * Objet `Exam` du contrat (§5). Un examen = un élève (schéma 008) ; `studentId` = users.id
 * (D-28), identité et leçons effectuées de l'élève par jointure ; pas d'instructeur attitré
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
  preferredDate: Date | null;
  message: string | null;
  dateTime: Date | null;
  location: string | null;
  result: ExamResult;
  score: number | null;
  notes: string | null;
  rejectionReason: string | null;
  price: number | null;
  paid: boolean;
  amount: number | null;
  paymentDate: Date | null;
  paymentMethod: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/** X2 : demande de l'élève, adressée à l'école. */
export interface RequestExamDTO {
  examType: ExamType;
  preferredDate: Date;
  message?: string;
}

/** Ce que le repository écrit pour une demande (élève et école résolus par le service). */
export interface NewExamRequest extends RequestExamDTO {
  /** students.id */
  studentRowId: string;
  schoolId: string;
}

/** X3 (5.6). */
export interface ScheduleExamDTO {
  dateTime: Date;
  location: string;
}

/** X4 (5.6), motif 10–500 caractères. */
export interface RejectExamDTO {
  reason: string;
}

/** X5 (5.6) : `score` facultatif (D-33), `result` ∈ passed | failed. */
export interface RecordResultDTO {
  result: ExamResult.PASSED | ExamResult.FAILED;
  score?: number;
  notes?: string;
}

/** Filtres de X1. */
export interface ExamFilters {
  status?: ExamStatus[];
}

/** Portée résolue par le service à partir de l'appelant : ses examens, ceux de son école, tout. */
export type ExamScope =
  | { kind: 'student'; studentRowId: string }
  | { kind: 'school'; schoolId: string }
  | { kind: 'all' };
