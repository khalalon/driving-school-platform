import { LessonType } from '../../../types/domain';

/** État actuel (créneaux créés par l'école) ; `pending` / `rejected` arrivent avec D-21 (3.3, 5.2). */
export enum LessonStatus {
  SCHEDULED = 'scheduled',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export const LESSON_STATUSES: readonly LessonStatus[] = Object.values(LessonStatus);

export interface Lesson {
  id: string;
  schoolId: string;
  instructorId: string | null;
  type: LessonType;
  dateTime: Date;
  durationMinutes: number;
  capacity: number;
  currentBookings: number;
  price: number;
  status: LessonStatus;
  createdAt: Date;
  updatedAt: Date;
}

/** `studentId` = students.id (ARCHITECTURE §4, double identifiant ; D-28 en 5.x). */
export interface LessonBooking {
  id: string;
  lessonId: string;
  studentId: string;
  attended: boolean | null;
  feedback: string | null;
  rating: number | null;
  createdAt: Date;
}

export interface CreateLessonDTO {
  schoolId: string;
  instructorId: string;
  type: LessonType;
  dateTime: Date;
  durationMinutes: number;
  capacity: number;
  price: number;
}

export interface UpdateLessonDTO {
  instructorId?: string;
  dateTime?: Date;
  durationMinutes?: number;
  capacity?: number;
  price?: number;
  status?: LessonStatus;
}

export interface BookLessonDTO {
  studentId: string;
}

export interface MarkAttendanceDTO {
  attended: boolean;
  feedback?: string;
  rating?: number;
}

export interface LessonFilters {
  schoolId?: string;
  instructorId?: string;
  studentId?: string;
  type?: LessonType;
  status?: LessonStatus;
  dateFrom?: Date;
  dateTo?: Date;
}
