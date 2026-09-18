import { Request, Response } from 'express';
import { HttpError, sendCaughtError, sendValidationError } from '../../../http/errors';
import { uuidParam, validate } from '../../../http/validation';
import { VerificationService } from '../services/verification.service';
import { lessonCompletedSchema } from '../validators/student.validator';

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
