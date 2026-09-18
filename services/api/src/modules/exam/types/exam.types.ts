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
 * Un examen = un élève (schéma 008) ; `studentId` = students.id en base (users.id dans l'API à
 * partir de 5.5, D-28). `dateTime` et `location` sont fixés à la planification (X3).
 * `studentFirstName` / `studentLastName` / `studentCompletedLessons` : jointures (contrat §5).
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
  examinerId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/** X2 (5.5) : demande de l'élève, adressée à l'école. */
export interface RequestExamDTO {
  examType: ExamType;
  preferredDate: Date;
  message?: string;
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

/**
 * Ancienne route `POST /api/exams` (session créée par l'école), conservée jusqu'en 5.5 : depuis
 * 008 un examen a toujours son élève, d'où `studentId` (students.id) ; il naît `scheduled`.
 */
export interface CreateExamDTO {
  schoolId: string;
  studentId: string;
  type: ExamType;
  dateTime: Date;
  location?: string;
  examinerId?: string;
  price: number;
}

/** Ancienne route `PUT /api/exams/:id`, conservée jusqu'en 5.5. */
export interface UpdateExamDTO {
  dateTime?: Date;
  location?: string;
  examinerId?: string;
  price?: number;
  status?: ExamStatus;
}

/** Filtres de X1 (`status`) et de l'ancienne liste publique (jusqu'en 5.5). */
export interface ExamFilters {
  status?: ExamStatus[];
  schoolId?: string;
  studentId?: string;
  type?: ExamType;
  dateFrom?: Date;
  dateTo?: Date;
}
