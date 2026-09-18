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

export const EXAM_TYPES: readonly ExamType[] = Object.values(ExamType);
export const EXAM_RESULTS: readonly ExamResult[] = Object.values(ExamResult);

/** État actuel (sessions créées par l'école). Modèle « demande d'élève » (D-01) en 3.4 / 5.5–5.6. */
export interface Exam {
  id: string;
  schoolId: string;
  type: ExamType;
  dateTime: Date;
  examinerId: string | null;
  price: number;
  capacity: number | null;
  createdAt: Date;
  updatedAt: Date;
}

/** `studentId` = students.id (double identifiant, ARCHITECTURE §4). */
export interface ExamRegistration {
  id: string;
  examId: string;
  studentId: string;
  result: ExamResult;
  score: number | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateExamDTO {
  schoolId: string;
  type: ExamType;
  dateTime: Date;
  examinerId?: string;
  price: number;
  capacity?: number;
}

export interface UpdateExamDTO {
  dateTime?: Date;
  examinerId?: string;
  price?: number;
  capacity?: number;
}

export interface RegisterForExamDTO {
  studentId: string;
}

export interface RecordResultDTO {
  result: ExamResult;
  score?: number;
  notes?: string;
}

export interface ExamFilters {
  schoolId?: string;
  type?: ExamType;
  dateFrom?: Date;
  dateTo?: Date;
}

export interface ExamEligibility {
  eligible: boolean;
  reason?: string;
  requiredLessons: number;
  completedLessons: number;
}
