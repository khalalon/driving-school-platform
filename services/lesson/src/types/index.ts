export enum LessonType {
  CODE = 'CODE',
  MANOEUVRE = 'Manœuvre',
  PARC = 'Parc',
}

export enum LessonStatus {
  SCHEDULED = 'scheduled',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export interface Lesson {
  id: string;
  schoolId: string;
  instructorId: string;
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

export interface LessonBooking {
  id: string;
  lessonId: string;
  studentId: string;
  attended: boolean | null;
  feedback: string | null;
  rating: number | null;
  createdAt: Date;
}

export interface Student {
  id: string;
  userId: string;
  schoolId: string;
  name: string;
  phone: string;
  address: string;
  authorized: boolean;
  profilePhotoUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
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

export interface AuthUser {
  userId: string;
  email: string;
  role: string;
}
