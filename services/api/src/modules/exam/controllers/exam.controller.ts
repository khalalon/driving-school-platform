import { Request, Response } from 'express';
import { sendCaughtError, sendValidationError } from '../../../http/errors';
import { uuidParam, validate } from '../../../http/validation';
import { ExamService } from '../services/exam.service';
import {
  createExamSchema,
  examFiltersSchema,
  updateExamSchema,
} from '../validators/exam.validator';

export class ExamController {
  constructor(private readonly examService: ExamService) {}

  createExam = async (req: Request, res: Response): Promise<void> => {
    const parsed = validate(createExamSchema, req.body);
    if (!parsed.ok) {
      sendValidationError(res, parsed.detail);
      return;
    }
    try {
      res.status(201).json(await this.examService.createExam(parsed.value));
    } catch (err) {
      sendCaughtError(res, err);
    }
  };

  getExams = async (req: Request, res: Response): Promise<void> => {
    const parsed = validate(examFiltersSchema, req.query);
    if (!parsed.ok) {
      sendValidationError(res, parsed.detail);
      return;
    }
    try {
      res.json(await this.examService.getExams(parsed.value));
    } catch (err) {
      sendCaughtError(res, err);
    }
  };

  getExam = async (req: Request, res: Response): Promise<void> => {
    try {
      res.json(await this.examService.getExamById(uuidParam(req.params.id, 'Examen')));
    } catch (err) {
      sendCaughtError(res, err);
    }
  };

  updateExam = async (req: Request, res: Response): Promise<void> => {
    const parsed = validate(updateExamSchema, req.body);
    if (!parsed.ok) {
      sendValidationError(res, parsed.detail);
      return;
    }
    try {
      res.json(await this.examService.updateExam(uuidParam(req.params.id, 'Examen'), parsed.value));
    } catch (err) {
      sendCaughtError(res, err);
    }
  };

  deleteExam = async (req: Request, res: Response): Promise<void> => {
    try {
      await this.examService.deleteExam(uuidParam(req.params.id, 'Examen'));
      res.status(204).send();
    } catch (err) {
      sendCaughtError(res, err);
    }
  };
}
