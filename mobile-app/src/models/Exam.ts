/**
 * Exam Models
 * Single Responsibility: Define exam data structures
 */

export enum ExamStatus {
  PENDING = 'pending',      // Request submitted, awaiting instructor approval
  SCHEDULED = 'scheduled',  // Approved and scheduled by instructor
  COMPLETED = 'completed',  // Exam taken, results recorded
  CANCELLED = 'cancelled',  // Request rejected or exam cancelled
}

export interface Exam {
  id: string;
  studentId: string;
  instructorId?: string;
  schoolId: string;
  type: 'THEORY' | 'PRACTICAL';
  status: ExamStatus;
  
  // Request information
  preferredDate?: string;
  message?: string;
  
  // Scheduled information (after instructor approval)
  dateTime?: string;
  location?: string;
  
  // Result information (after completion)
  result?: 'PASS' | 'FAIL';
  score?: number;
  notes?: string;
  
  // Rejection information
  rejectionReason?: string;
  
  createdAt: Date;
  updatedAt: Date;
}