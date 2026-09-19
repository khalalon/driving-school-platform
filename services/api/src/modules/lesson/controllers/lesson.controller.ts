import { Response } from 'express';
import { sendCaughtError, sendValidationError } from '../../../http/errors';
import { uuidParam, validate } from '../../../http/validation';
import { AuthRequest, getAuthUser } from '../../../middleware/auth.middleware';
import { LessonService } from '../services/lesson.service';
import {
  approveLessonSchema,
  bookForStudentSchema,
  cancelLessonSchema,
  lessonFiltersSchema,
  markAttendanceSchema,
  rejectLessonSchema,
  requestLessonSchema,
} from '../validators/lesson.validator';

export class LessonController {
  constructor(private readonly lessonService: LessonService) {}

  /** L2 */
  requestLesson = async (req: AuthRequest, res: Response): Promise<void> => {
    const parsed = validate(requestLessonSchema, req.body);
    if (!parsed.ok) {
      sendValidationError(res, parsed.detail);
      return;
    }
    try {
      res.status(201).json(await this.lessonService.requestLesson(getAuthUser(req), parsed.value));
    } catch (err) {
      sendCaughtError(res, err);
    }
  };

  /** L1 */
  listLessons = async (req: AuthRequest, res: Response): Promise<void> => {
    const parsed = validate(lessonFiltersSchema, req.query);
    if (!parsed.ok) {
      sendValidationError(res, parsed.detail);
      return;
    }
    try {
      res.json(await this.lessonService.listLessons(getAuthUser(req), parsed.value));
    } catch (err) {
      sendCaughtError(res, err);
    }
  };

  getLesson = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const id = uuidParam(req.params.id, 'Leçon');
      res.json(await this.lessonService.getLesson(getAuthUser(req), id));
    } catch (err) {
      sendCaughtError(res, err);
    }
  };

  /** L5 */
  approveLesson = async (req: AuthRequest, res: Response): Promise<void> => {
    const parsed = validate(approveLessonSchema, req.body);
    if (!parsed.ok) {
      sendValidationError(res, parsed.detail);
      return;
    }
    try {
      const id = uuidParam(req.params.id, 'Leçon');
      res.json(await this.lessonService.approveLesson(getAuthUser(req), id, parsed.value));
    } catch (err) {
      sendCaughtError(res, err);
    }
  };

  /** L6 */
  rejectLesson = async (req: AuthRequest, res: Response): Promise<void> => {
    const parsed = validate(rejectLessonSchema, req.body);
    if (!parsed.ok) {
      sendValidationError(res, parsed.detail);
      return;
    }
    try {
      const id = uuidParam(req.params.id, 'Leçon');
      res.json(await this.lessonService.rejectLesson(getAuthUser(req), id, parsed.value));
    } catch (err) {
      sendCaughtError(res, err);
    }
  };

  /** L4 */
  bookForStudent = async (req: AuthRequest, res: Response): Promise<void> => {
    const parsed = validate(bookForStudentSchema, req.body);
    if (!parsed.ok) {
      sendValidationError(res, parsed.detail);
      return;
    }
    try {
      res.status(201).json(await this.lessonService.bookForStudent(getAuthUser(req), parsed.value));
    } catch (err) {
      sendCaughtError(res, err);
    }
  };

  /** L7 */
  markAttendance = async (req: AuthRequest, res: Response): Promise<void> => {
    const parsed = validate(markAttendanceSchema, req.body);
    if (!parsed.ok) {
      sendValidationError(res, parsed.detail);
      return;
    }
    try {
      const id = uuidParam(req.params.id, 'Leçon');
      res.json(await this.lessonService.markAttendance(getAuthUser(req), id, parsed.value));
    } catch (err) {
      sendCaughtError(res, err);
    }
  };

  /** L3 */
  cancelLesson = async (req: AuthRequest, res: Response): Promise<void> => {
    const parsed = validate(cancelLessonSchema, req.body ?? {});
    if (!parsed.ok) {
      sendValidationError(res, parsed.detail);
      return;
    }
    try {
      const id = uuidParam(req.params.id, 'Leçon');
      res.json(await this.lessonService.cancelLesson(getAuthUser(req), id, parsed.value));
    } catch (err) {
      sendCaughtError(res, err);
    }
  };
}
