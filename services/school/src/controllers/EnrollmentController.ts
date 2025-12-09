/**
 * Enrollment Controller
 * Single Responsibility: Handle student enrollment requests
 * SOLID: Depends on abstractions (IEnrollmentService)
 */

import { Request, Response, NextFunction } from 'express';
import { IEnrollmentService } from '../services/interfaces/IEnrollmentService';

export class EnrollmentController {
  constructor(private enrollmentService: IEnrollmentService) {}

  /**
   * Student requests enrollment in a school
   * POST /api/schools/:schoolId/enrollment/request
   */
  async requestEnrollment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { schoolId } = req.params;
      const studentId = req.user!.id; // From auth middleware
      const { message } = req.body;

      const request = await this.enrollmentService.createEnrollmentRequest({
        studentId,
        schoolId,
        message,
      });

      res.status(201).json({
        success: true,
        data: request,
        message: 'Enrollment request submitted successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get student's enrollment requests
   * GET /api/enrollment/my-requests
   */
  async getMyRequests(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const studentId = req.user!.id;
      const requests = await this.enrollmentService.getStudentRequests(studentId);

      res.json({
        success: true,
        data: requests,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get pending enrollment requests for a school (Instructor/Admin)
   * GET /api/schools/:schoolId/enrollment/requests
   */
  async getSchoolRequests(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { schoolId } = req.params;
      const { status } = req.query;

      const requests = await this.enrollmentService.getSchoolRequests(
        schoolId,
        status as string
      );

      res.json({
        success: true,
        data: requests,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Approve enrollment request (Instructor/Admin)
   * PUT /api/enrollment/:requestId/approve
   */
  async approveRequest(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { requestId } = req.params;
      const processedBy = req.user!.id;

      const result = await this.enrollmentService.approveRequest(requestId, processedBy);

      res.json({
        success: true,
        data: result,
        message: 'Enrollment request approved',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Reject enrollment request (Instructor/Admin)
   * PUT /api/enrollment/:requestId/reject
   */
  async rejectRequest(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { requestId } = req.params;
      const processedBy = req.user!.id;
      const { reason } = req.body;

      const result = await this.enrollmentService.rejectRequest(
        requestId,
        processedBy,
        reason
      );

      res.json({
        success: true,
        data: result,
        message: 'Enrollment request rejected',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Check if student is enrolled in school
   * GET /api/schools/:schoolId/enrollment/status
   */
  async checkEnrollmentStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { schoolId } = req.params;
      const studentId = req.user!.id;

      const status = await this.enrollmentService.getEnrollmentStatus(studentId, schoolId);

      res.json({
        success: true,
        data: status,
      });
    } catch (error) {
      next(error);
    }
  }
}
