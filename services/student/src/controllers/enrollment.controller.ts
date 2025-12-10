import { Response } from 'express';
import { EnrollmentService } from '../services/enrollment.service';
import { AuthRequest } from '../middleware/auth.middleware';
import {
  createEnrollmentRequestSchema,
  rejectEnrollmentRequestSchema,
} from '../validators/student.validator';

export class EnrollmentController {
  constructor(private readonly enrollmentService: EnrollmentService) {}

  requestEnrollment = async (req: AuthRequest, res: Response): Promise<void> => {
    const { error, value } = createEnrollmentRequestSchema.validate(req.body);
    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }

    try {
      const { schoolId } = req.params;
      const studentId = req.user!.userId;

      const request = await this.enrollmentService.createEnrollmentRequest(
        studentId,
        schoolId,
        value.message
      );

      res.status(201).json(request);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  };

  getMyRequests = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const studentId = req.user!.userId;
      const requests = await this.enrollmentService.getStudentRequests(studentId);
      res.json(requests);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  };

  getSchoolRequests = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { schoolId } = req.params;
      const { status } = req.query;

      const requests = await this.enrollmentService.getSchoolRequests(schoolId, status as string);
      res.json(requests);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  };

  approveRequest = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { requestId } = req.params;
      const processedBy = req.user!.userId;

      const result = await this.enrollmentService.approveRequest(requestId, processedBy);
      res.json(result);
    } catch (err: any) {
      res.status(404).json({ error: err.message });
    }
  };

  rejectRequest = async (req: AuthRequest, res: Response): Promise<void> => {
    const { error, value } = rejectEnrollmentRequestSchema.validate(req.body);
    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }

    try {
      const { requestId } = req.params;
      const processedBy = req.user!.userId;

      const result = await this.enrollmentService.rejectRequest(
        requestId,
        processedBy,
        value.reason
      );
      res.json(result);
    } catch (err: any) {
      res.status(404).json({ error: err.message });
    }
  };

  checkEnrollmentStatus = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { schoolId } = req.params;
      const studentId = req.user!.userId;

      const status = await this.enrollmentService.getEnrollmentStatus(studentId, schoolId);
      res.json(status);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  };
}
