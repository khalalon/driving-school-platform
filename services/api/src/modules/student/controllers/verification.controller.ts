import { Request, Response } from 'express';
import { HttpError, sendCaughtError, sendValidationError } from '../../../http/errors';
import { enumQuery, uuidParam, validate } from '../../../http/validation';
import { ExamType, VerificationService } from '../services/verification.service';
import { lessonCompletedSchema } from '../validators/student.validator';

const EXAM_TYPES: readonly ExamType[] = ['theory', 'practical'];

/**
 * Routes `/api/verification` : publiques aujourd'hui (aucun middleware), portées telles quelles.
 * Nginx cesse de les exposer en 2.6 (D-14) ; elles sont retirées en 5.7.
 */
export class VerificationController {
  constructor(private readonly verificationService: VerificationService) {}

  verifyEnrollment = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = this.requiredQuery(req.query.userId, 'userId');
      const schoolId = this.requiredQuery(req.query.schoolId, 'schoolId');
      res.json(await this.verificationService.verifyEnrollment(userId, schoolId));
    } catch (err) {
      sendCaughtError(res, err);
    }
  };

  checkEligibility = async (req: Request, res: Response): Promise<void> => {
    try {
      const studentId = uuidParam(req.params.studentId, 'Élève');
      const schoolId = this.requiredQuery(req.query.schoolId, 'schoolId');
      const examType = enumQuery(req.query.examType, EXAM_TYPES, 'examType');
      if (!examType) {
        throw new HttpError(400, 'VALIDATION_ERROR', 'Données invalides : examType est requis');
      }
      res.json(await this.verificationService.checkExamEligibility(studentId, schoolId, examType));
    } catch (err) {
      sendCaughtError(res, err);
    }
  };

  recordLessonCompletion = async (req: Request, res: Response): Promise<void> => {
    const parsed = validate(lessonCompletedSchema, req.body);
    if (!parsed.ok) {
      sendValidationError(res, parsed.detail);
      return;
    }
    try {
      const studentId = uuidParam(req.params.studentId, 'Élève');
      res.json(await this.verificationService.recordLessonCompletion(studentId, parsed.value));
    } catch (err) {
      sendCaughtError(res, err);
    }
  };

  private requiredQuery(value: unknown, label: string): string {
    if (typeof value !== 'string' || value.length === 0) {
      throw new HttpError(400, 'VALIDATION_ERROR', `Données invalides : ${label} est requis`);
    }
    return value;
  }
}
