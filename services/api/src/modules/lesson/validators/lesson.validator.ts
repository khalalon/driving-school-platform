import Joi, { CustomHelpers } from 'joi';
import { LESSON_TYPES } from '../../../types/domain';
import {
  AgendaQuery,
  ApproveLessonDTO,
  BookForStudentDTO,
  CancelLessonDTO,
  LESSON_STATUSES,
  LessonFilters,
  LessonStatus,
  MarkAttendanceDTO,
  RejectLessonDTO,
  RequestLessonDTO,
} from '../types/lesson.types';

const uuid = Joi.string().uuid();
const lessonType = Joi.string().valid(...LESSON_TYPES);
const futureDate = Joi.date().iso().greater('now');
const durationMinutes = Joi.number().integer().min(15).max(480);
const price = Joi.number().positive();

/** L2. */
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

/** L7. */
export const markAttendanceSchema = Joi.object<MarkAttendanceDTO>({
  attended: Joi.boolean().required(),
  feedback: Joi.string().max(1000).optional(),
  rating: Joi.number().integer().min(1).max(5).optional(),
});

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

/** L1. */
export const lessonFiltersSchema = Joi.object<LessonFilters>({
  status: statusList.optional(),
  scope: Joi.string().valid('school', 'mine').optional(),
  date: Joi.string()
    .pattern(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});

/** Plage maximale de l'agenda (L9) : un mois. */
export const AGENDA_MAX_DAYS = 31;

/** L9 (15.1) : `from` < `to`, plage ≤ 31 jours ; `instructorId` facultatif (D-59). */
export const agendaQuerySchema = Joi.object<AgendaQuery>({
  from: Joi.date().iso().required(),
  to: Joi.date().iso().greater(Joi.ref('from')).required(),
  instructorId: uuid.optional(),
}).custom((value: AgendaQuery, helpers: CustomHelpers) => {
  const days = (value.to.getTime() - value.from.getTime()) / 86_400_000;
  if (days > AGENDA_MAX_DAYS) {
    return helpers.message({
      custom: `La plage de l'agenda ne peut pas dépasser ${AGENDA_MAX_DAYS} jours`,
    }) as never;
  }
  return value;
}, 'plage de l’agenda');
