import { Response } from 'express';
import { sendCaughtError, sendValidationError } from '../../../http/errors';
import { uuidParam, validate } from '../../../http/validation';
import { AuthRequest, getAuthUser } from '../../../middleware/auth.middleware';
import { ExamService } from '../services/exam.service';
import { examFiltersSchema, requestExamSchema } from '../validators/exam.validator';

export class ExamController {
  constructor(private readonly examService: ExamService) {}

  /** X2 */
  requestExam = async (req: AuthRequest, res: Response): Promise<void> => {
    const parsed = validate(requestExamSchema, req.body);
    if (!parsed.ok) {
      sendValidationError(res, parsed.detail);
      return;
    }
    try {
      res.status(201).json(await this.examService.requestExam(getAuthUser(req), parsed.value));
    } catch (err) {
      sendCaughtError(res, err);
    }
  };

  /** X1 */
  listMyExams = async (req: AuthRequest, res: Response): Promise<void> => {
    const parsed = validate(examFiltersSchema, req.query);
    if (!parsed.ok) {
      sendValidationError(res, parsed.detail);
      return;
    }
    try {
      res.json(await this.examService.listExams(getAuthUser(req), parsed.value));
    } catch (err) {
      sendCaughtError(res, err);
    }
  };

  getExam = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const id = uuidParam(req.params.id, 'Examen');
      res.json(await this.examService.getExam(getAuthUser(req), id));
    } catch (err) {
      sendCaughtError(res, err);
    }
  };
}
