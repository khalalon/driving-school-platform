import { Request, Response } from 'express';
import { HttpError, sendCaughtError, sendValidationError } from '../../../http/errors';
import { enumQuery, uuidParam, validate } from '../../../http/validation';
import { ExamService } from '../services/exam.service';
import { RegistrationService } from '../services/registration.service';
import { EXAM_TYPES } from '../types/exam.types';
import {
  createExamSchema,
  examFiltersSchema,
  recordResultSchema,
  registerForExamSchema,
  updateExamSchema,
} from '../validators/exam.validator';

export class ExamController {
  constructor(
    private readonly examService: ExamService,
    private readonly registrationService: RegistrationService
  ) {}

  // --- Sessions ---

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

  checkAvailability = async (req: Request, res: Response): Promise<void> => {
    try {
      const available = await this.examService.checkAvailability(
        uuidParam(req.params.id, 'Examen')
      );
      res.json({ available });
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

  // --- Inscriptions ---

  registerForExam = async (req: Request, res: Response): Promise<void> => {
    const parsed = validate(registerForExamSchema, req.body);
    if (!parsed.ok) {
      sendValidationError(res, parsed.detail);
      return;
    }
    try {
      const examId = uuidParam(req.params.examId, 'Examen');
      res
        .status(201)
        .json(await this.registrationService.registerForExam(examId, parsed.value.studentId));
    } catch (err) {
      sendCaughtError(res, err);
    }
  };

  getRegistration = async (req: Request, res: Response): Promise<void> => {
    try {
      res.json(
        await this.registrationService.getRegistrationById(
          uuidParam(req.params.id, "Inscription à l'examen")
        )
      );
    } catch (err) {
      sendCaughtError(res, err);
    }
  };

  getRegistrationsByExam = async (req: Request, res: Response): Promise<void> => {
    try {
      res.json(
        await this.registrationService.getRegistrationsByExam(
          uuidParam(req.params.examId, 'Examen')
        )
      );
    } catch (err) {
      sendCaughtError(res, err);
    }
  };

  getRegistrationsByStudent = async (req: Request, res: Response): Promise<void> => {
    try {
      res.json(
        await this.registrationService.getRegistrationsByStudent(
          uuidParam(req.params.studentId, 'Élève')
        )
      );
    } catch (err) {
      sendCaughtError(res, err);
    }
  };

  recordResult = async (req: Request, res: Response): Promise<void> => {
    const parsed = validate(recordResultSchema, req.body);
    if (!parsed.ok) {
      sendValidationError(res, parsed.detail);
      return;
    }
    try {
      const registrationId = uuidParam(req.params.registrationId, "Inscription à l'examen");
      res.json(await this.registrationService.recordResult(registrationId, parsed.value));
    } catch (err) {
      sendCaughtError(res, err);
    }
  };

  cancelRegistration = async (req: Request, res: Response): Promise<void> => {
    try {
      await this.registrationService.cancelRegistration(
        uuidParam(req.params.registrationId, "Inscription à l'examen")
      );
      res.status(204).send();
    } catch (err) {
      sendCaughtError(res, err);
    }
  };

  checkEligibility = async (req: Request, res: Response): Promise<void> => {
    try {
      const studentId = uuidParam(req.params.studentId, 'Élève');
      const type = enumQuery(req.query.type, EXAM_TYPES, 'type');
      if (!type) {
        throw new HttpError(400, 'VALIDATION_ERROR', 'Données invalides : type est requis');
      }
      res.json(await this.registrationService.checkEligibility(studentId, type));
    } catch (err) {
      sendCaughtError(res, err);
    }
  };
}
