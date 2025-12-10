import { Request, Response } from 'express';
import { VerificationService } from '../services/verification.service';
import { lessonCompletedSchema } from '../validators/student.validator';

export class VerificationController {
  constructor(private readonly verificationService: VerificationService) {}

  verifyEnrollment = async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId, schoolId } = req.query;

      if (!userId || !schoolId) {
        res.status(400).json({ error: 'userId and schoolId are required' });
        return;
      }

      const status = await this.verificationService.verifyEnrollment(
        userId as string,
        schoolId as string
      );
      res.json(status);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  };

  checkEligibility = async (req: Request, res: Response): Promise<void> => {
    try {
      const { studentId } = req.params;
      const { schoolId, examType } = req.query;

      if (!schoolId || !examType) {
        res.status(400).json({ error: 'schoolId and examType are required' });
        return;
      }

      if (examType !== 'theory' && examType !== 'practical') {
        res.status(400).json({ error: 'examType must be theory or practical' });
        return;
      }

      const eligibility = await this.verificationService.checkExamEligibility(
        studentId,
        schoolId as string,
        examType as 'theory' | 'practical'
      );
      res.json(eligibility);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  };

  recordLessonCompletion = async (req: Request, res: Response): Promise<void> => {
    const { error, value } = lessonCompletedSchema.validate(req.body);
    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }

    try {
      const { studentId } = req.params;
      const stats = await this.verificationService.recordLessonCompletion(studentId, value);
      res.json(stats);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  };
}
