import { IEnrollmentRepository } from '../repositories/enrollment.repository';
import { IStudentRepository } from '../repositories/student.repository';
import { EnrollmentRequest, EnrollmentStatus } from '../types';

export class EnrollmentService {
  constructor(
    private readonly enrollmentRepository: IEnrollmentRepository,
    private readonly studentRepository: IStudentRepository
  ) {}

  async createEnrollmentRequest(
    studentId: string,
    schoolId: string,
    message?: string
  ): Promise<EnrollmentRequest> {
    const existingStudent = await this.studentRepository.findByUserAndSchool(studentId, schoolId);

    if (existingStudent) {
      throw new Error('Already enrolled in this school');
    }

    const existingRequest = await this.enrollmentRepository.findByStudentAndSchool(
      studentId,
      schoolId
    );

    if (existingRequest && existingRequest.status === 'pending') {
      throw new Error('Enrollment request already pending');
    }

    if (existingRequest && existingRequest.status === 'approved') {
      throw new Error('Already approved for this school');
    }

    return this.enrollmentRepository.create(studentId, schoolId, message);
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

    const updatedRequest = await this.enrollmentRepository.updateStatus(
      requestId,
      'approved',
      processedBy
    );

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

    return this.enrollmentRepository.updateStatus(requestId, 'rejected', processedBy, reason);
  }

  async getEnrollmentStatus(studentId: string, schoolId: string): Promise<EnrollmentStatus> {
    const student = await this.studentRepository.findByUserAndSchool(studentId, schoolId);

    if (student && student.authorized) {
      return {
        isEnrolled: true,
        requestStatus: 'approved',
        enrollmentDate: student.createdAt,
        canBook: true,
      };
    }

    const request = await this.enrollmentRepository.findByStudentAndSchool(studentId, schoolId);

    if (request) {
      return {
        isEnrolled: false,
        requestStatus: request.status,
        canBook: false,
      };
    }

    return {
      isEnrolled: false,
      canBook: false,
    };
  }
}
