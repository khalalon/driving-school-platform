/**
 * Enrollment Service Implementation
 * Single Responsibility: Handle enrollment business logic
 * Dependency Inversion: Depends on IEnrollmentRepository abstraction
 */

import { IEnrollmentService, EnrollmentRequest, CreateEnrollmentRequestDto, EnrollmentStatus } from './interfaces/IEnrollmentService';
import { IEnrollmentRepository } from '../repositories/interfaces/IEnrollmentRepository';
import { IStudentRepository } from '../repositories/interfaces/IStudentRepository';

export class EnrollmentService implements IEnrollmentService {
  constructor(
    private enrollmentRepository: IEnrollmentRepository,
    private studentRepository: IStudentRepository
  ) {}

  async createEnrollmentRequest(data: CreateEnrollmentRequestDto): Promise<EnrollmentRequest> {
    // Check if already enrolled
    const existingStudent = await this.studentRepository.findByUserAndSchool(
      data.studentId,
      data.schoolId
    );

    if (existingStudent) {
      throw new Error('Already enrolled in this school');
    }

    // Check for existing pending request
    const existingRequest = await this.enrollmentRepository.findByStudentAndSchool(
      data.studentId,
      data.schoolId
    );

    if (existingRequest && existingRequest.status === 'pending') {
      throw new Error('Enrollment request already pending');
    }

    if (existingRequest && existingRequest.status === 'approved') {
      throw new Error('Already approved for this school');
    }

    // Create new request
    return this.enrollmentRepository.create(data);
  }

  async getStudentRequests(studentId: string): Promise<EnrollmentRequest[]> {
    return this.enrollmentRepository.findByStudent(studentId);
  }

  async getSchoolRequests(schoolId: string, status?: string): Promise<EnrollmentRequest[]> {
    return this.enrollmentRepository.findBySchool(schoolId, status);
  }

  async approveRequest(requestId: string, processedBy: string): Promise<EnrollmentRequest> {
    const request = await this.enrollmentRepository.findById(requestId);
    
    if (!request) {
      throw new Error('Enrollment request not found');
    }

    if (request.status !== 'pending') {
      throw new Error('Request already processed');
    }

    // Update request status
    const updatedRequest = await this.enrollmentRepository.updateStatus(
      requestId,
      'approved',
      processedBy
    );

    // Create student record
    await this.studentRepository.create({
      userId: request.studentId,
      schoolId: request.schoolId,
      authorized: true,
      enrollmentRequestId: requestId,
    });

    return updatedRequest;
  }

  async rejectRequest(
    requestId: string,
    processedBy: string,
    reason: string
  ): Promise<EnrollmentRequest> {
    const request = await this.enrollmentRepository.findById(requestId);
    
    if (!request) {
      throw new Error('Enrollment request not found');
    }

    if (request.status !== 'pending') {
      throw new Error('Request already processed');
    }

    return this.enrollmentRepository.updateStatus(
      requestId,
      'rejected',
      processedBy,
      reason
    );
  }

  async getEnrollmentStatus(studentId: string, schoolId: string): Promise<EnrollmentStatus> {
    // Check if student record exists
    const student = await this.studentRepository.findByUserAndSchool(studentId, schoolId);
    
    if (student && student.authorized) {
      return {
        isEnrolled: true,
        requestStatus: 'approved',
        enrollmentDate: student.createdAt,
        canBook: true,
      };
    }

    // Check for pending/rejected request
    const request = await this.enrollmentRepository.findByStudentAndSchool(studentId, schoolId);
    
    if (request) {
      return {
        isEnrolled: false,
        requestStatus: request.status,
        canBook: false,
      };
    }

    // No enrollment or request
    return {
      isEnrolled: false,
      canBook: false,
    };
  }
}
