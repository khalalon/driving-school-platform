import { Response } from 'express';
import { sendCaughtError, sendValidationError } from '../../../http/errors';
import { enumQuery, uuidParam, validate } from '../../../http/validation';
import { AuthRequest, getAuthUser } from '../../../middleware/auth.middleware';
import { ENROLLMENT_REQUEST_STATUSES } from '../../../types/domain';
import { EnrollmentService } from '../services/enrollment.service';
import {
  createEnrollmentRequestSchema,
  rejectEnrollmentRequestSchema,
} from '../validators/student.validator';

export class EnrollmentController {
  constructor(private readonly enrollmentService: EnrollmentService) {}

  /** E2 — l'élève (users.id du jeton) demande à rejoindre une école. */
  requestEnrollment = async (req: AuthRequest, res: Response): Promise<void> => {
    const parsed = validate(createEnrollmentRequestSchema, req.body);
    if (!parsed.ok) {
      sendValidationError(res, parsed.detail);
      return;
    }
    try {
      const schoolId = uuidParam(req.params.schoolId, 'École');
      const studentId = getAuthUser(req).userId;
      const request = await this.enrollmentService.createEnrollmentRequest(
        studentId,
        schoolId,
        parsed.value.message
      );
      res.status(201).json(request);
    } catch (err) {
      sendCaughtError(res, err);
    }
  };

  /** E3 */
  getMyRequests = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      res.json(await this.enrollmentService.getStudentRequests(getAuthUser(req).userId));
    } catch (err) {
      sendCaughtError(res, err);
    }
  };

  /** E4 */
  getSchoolRequests = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const schoolId = uuidParam(req.params.schoolId, 'École');
      const status = enumQuery(req.query.status, ENROLLMENT_REQUEST_STATUSES, 'status');
      res.json(await this.enrollmentService.getSchoolRequests(schoolId, status));
    } catch (err) {
      sendCaughtError(res, err);
    }
  };

  /** E5 */
  approveRequest = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const requestId = uuidParam(req.params.requestId, "Demande d'inscription");
      res.json(await this.enrollmentService.approveRequest(requestId, getAuthUser(req).userId));
    } catch (err) {
      sendCaughtError(res, err);
    }
  };

  /** E6 */
  rejectRequest = async (req: AuthRequest, res: Response): Promise<void> => {
    const parsed = validate(rejectEnrollmentRequestSchema, req.body);
    if (!parsed.ok) {
      sendValidationError(res, parsed.detail);
      return;
    }
    try {
      const requestId = uuidParam(req.params.requestId, "Demande d'inscription");
      res.json(
        await this.enrollmentService.rejectRequest(
          requestId,
          getAuthUser(req).userId,
          parsed.value.reason
        )
      );
    } catch (err) {
      sendCaughtError(res, err);
    }
  };

  /** E1 */
  checkEnrollmentStatus = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const schoolId = uuidParam(req.params.schoolId, 'École');
      res.json(await this.enrollmentService.getEnrollmentStatus(getAuthUser(req).userId, schoolId));
    } catch (err) {
      sendCaughtError(res, err);
    }
  };
}
