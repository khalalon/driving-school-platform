export enum ExamType {
  THEORY = 'theory',
  PRACTICAL = 'practical',
}

export enum ExamResult {
  PENDING = 'pending',
  PASSED = 'passed',
  FAILED = 'failed',
}

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

export interface Student {
  id: string;
  userId: string;
  schoolId: string;
  name: string;
  authorized: boolean;
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
  requiredLessons?: number;
  completedLessons?: number;
}

export interface AuthUser {
  userId: string;
  email: string;
  role: string;
}
