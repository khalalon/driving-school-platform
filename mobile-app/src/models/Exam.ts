/**
 * Exam Models
 * Single Responsibility: Define exam data structures
 */

export enum ExamStatus {
  SCHEDULED = 'scheduled',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export interface Exam {
  id: string;
  type: 'THEORY' | 'PRACTICAL';
  dateTime: string;
  location?: string;
  status: ExamStatus;
  result?: 'PASS' | 'FAIL';
  score?: number;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}
