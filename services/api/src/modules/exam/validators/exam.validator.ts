import Joi, { CustomHelpers } from 'joi';
import {
  EXAM_STATUSES,
  EXAM_TYPES,
  ExamFilters,
  ExamResult,
  ExamStatus,
  RecordResultDTO,
  RejectExamDTO,
  RequestExamDTO,
  ScheduleExamDTO,
} from '../types/exam.types';

const examType = Joi.string().valid(...EXAM_TYPES);
const futureDate = Joi.date().iso().greater('now');
const location = Joi.string().min(2).max(255);

/** X2. */
export const requestExamSchema = Joi.object<RequestExamDTO>({
  examType: examType.required(),
  preferredDate: futureDate.required(),
  message: Joi.string().max(1000).optional(),
});

/** X3 (5.6). */
export const scheduleExamSchema = Joi.object<ScheduleExamDTO>({
  dateTime: futureDate.required(),
  location: location.required(),
});

/** X4 (5.6). */
export const rejectExamSchema = Joi.object<RejectExamDTO>({
  reason: Joi.string().min(10).max(500).required(),
});

/** X5 (5.6) : `pending` n'est pas un résultat enregistrable ; score 0–100 facultatif (D-33). */
export const recordResultSchema = Joi.object<RecordResultDTO>({
  result: Joi.string().valid(ExamResult.PASSED, ExamResult.FAILED).required(),
  score: Joi.number().integer().min(0).max(100).optional(),
  notes: Joi.string().max(1000).optional(),
});

/** `status=pending,scheduled` (X1) → tableau de statuts connus. */
const statusList = Joi.custom((value: unknown, helpers: CustomHelpers): ExamStatus[] => {
  const raw: unknown[] = Array.isArray(value) ? value : String(value).split(',');
  const statuses = raw.map((item) => String(item).trim());
  const unknownStatus = statuses.find((status) => !EXAM_STATUSES.includes(status as ExamStatus));
  if (unknownStatus !== undefined) {
    return helpers.message({
      custom: `"status" doit être parmi ${EXAM_STATUSES.join(', ')} (reçu : ${unknownStatus})`,
    }) as never;
  }
  return statuses as ExamStatus[];
}, 'liste de statuts');

/** X1. */
export const examFiltersSchema = Joi.object<ExamFilters>({
  status: statusList.optional(),
});
