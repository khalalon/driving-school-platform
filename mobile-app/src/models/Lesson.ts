/**
 * Lesson Models
 * Single Responsibility: Define lesson data structures
 */

export enum LessonType {
  PRACTICAL = 'PRACTICAL',
  THEORY = 'THEORY',
}

export enum LessonStatus {
  SCHEDULED = 'scheduled',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export interface Lesson {
  id: string;
  schoolId: string;
  instructorId?: string;
  type: LessonType;
  startTime: string;
  duration: number;
  price?: number;
  status: LessonStatus;
  instructor?: {
    id: string;
    firstName: string;
    lastName: string;
  };
  createdAt: Date;
  updatedAt: Date;
}
