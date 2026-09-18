import Joi, { CustomHelpers } from 'joi';
import { LESSON_TYPES } from '../../../types/domain';
import {
  ApproveLessonDTO,
  BookForStudentDTO,
  BookLessonDTO,
  CancelLessonDTO,
  CreateLessonDTO,
  LESSON_STATUSES,
  LessonFilters,
  LessonStatus,
  MarkAttendanceDTO,
  RejectLessonDTO,
  RequestLessonDTO,
  UpdateLessonDTO,
} from '../types/lesson.types';

const uuid = Joi.string().uuid();
const lessonType = Joi.string().valid(...LESSON_TYPES);
const futureDate = Joi.date().iso().greater('now');
const durationMinutes = Joi.number().integer().min(15).max(480);
const price = Joi.number().positive();

/** L2 (5.2). */
export const requestLessonSchema = Joi.object<RequestLessonDTO>({
  type: lessonType.required(),
  requestedDate: futureDate.required(),
  preferredInstructorId: uuid.optional(),
  notes: Joi.string().max(1000).optional(),
});

/** L5 (5.3) : `price` facultatif, la grille de l'école prime (D-30). */
export const approveLessonSchema = Joi.object<ApproveLessonDTO>({
  scheduledDate: futureDate.required(),
  durationMinutes: durationMinutes.required(),
  price: price.optional(),
  adminNotes: Joi.string().max(1000).optional(),
});

/** L6 (5.3), D-29. */
export const rejectLessonSchema = Joi.object<RejectLessonDTO>({
  reason: Joi.string().min(10).max(500).required(),
});

/** L3 (5.3). */
export const cancelLessonSchema = Joi.object<CancelLessonDTO>({
  reason: Joi.string().max(500).optional(),
});

/** L4 (5.4). */
export const bookForStudentSchema = Joi.object<BookForStudentDTO>({
  studentId: uuid.required(),
  type: lessonType.required(),
  scheduledDate: futureDate.required(),
  durationMinutes: durationMinutes.required(),
  price: price.optional(),
  notes: Joi.string().max(1000).optional(),
});

/** Ancienne route `POST /api/lessons/:lessonId/book` (jusqu'en 5.2). */
export const bookLessonSchema = Joi.object<BookLessonDTO>({
  studentId: uuid.required(),
});

/** L7. */
export const markAttendanceSchema = Joi.object<MarkAttendanceDTO>({
  attended: Joi.boolean().required(),
  feedback: Joi.string().max(1000).optional(),
  rating: Joi.number().integer().min(1).max(5).optional(),
});

/** Ancienne route `POST /api/lessons` (jusqu'en 5.2) : une leçon planifiée pour un élève donné. */
export const createLessonSchema = Joi.object<CreateLessonDTO>({
  schoolId: uuid.required(),
  studentId: uuid.required(),
  instructorId: uuid.required(),
  type: lessonType.required(),
  scheduledDate: futureDate.required(),
  durationMinutes: durationMinutes.required(),
  price: price.required(),
});

/** Ancienne route `PUT /api/lessons/:id` (jusqu'en 5.2). */
export const updateLessonSchema = Joi.object<UpdateLessonDTO>({
  instructorId: uuid.optional(),
  scheduledDate: futureDate.optional(),
  durationMinutes: durationMinutes.optional(),
  price: price.optional(),
  status: Joi.string()
    .valid(...LESSON_STATUSES)
    .optional(),
}).min(1);

/** `status=pending,scheduled` (L1) → tableau de statuts connus. */
const statusList = Joi.custom((value: unknown, helpers: CustomHelpers): LessonStatus[] => {
  const raw: unknown[] = Array.isArray(value) ? value : String(value).split(',');
  const statuses = raw.map((item) => String(item).trim());
  const unknownStatus = statuses.find(
    (status) => !LESSON_STATUSES.includes(status as LessonStatus)
  );
  if (unknownStatus !== undefined) {
    return helpers.message({
      custom: `"status" doit être parmi ${LESSON_STATUSES.join(', ')} (reçu : ${unknownStatus})`,
    }) as never;
  }
  return statuses as LessonStatus[];
}, 'liste de statuts');

export const lessonFiltersSchema = Joi.object<LessonFilters>({
  status: statusList.optional(),
  scope: Joi.string().valid('school', 'mine').optional(),
  date: Joi.string()
    .pattern(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  schoolId: uuid.optional(),
  instructorId: uuid.optional(),
  studentId: uuid.optional(),
  type: lessonType.optional(),
  dateFrom: Joi.date().iso().optional(),
  dateTo: Joi.date().iso().optional(),
});
