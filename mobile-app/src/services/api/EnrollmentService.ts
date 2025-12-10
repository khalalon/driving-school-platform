/**
 * Enrollment Service - API calls for enrollment management
 * Single Responsibility: Handle enrollment-related API requests
 */

import { apiClient } from './ApiClient';
import { API_CONFIG, replaceUrlParams } from '../../config/api.config';

export interface EnrollmentRequest {
  id: string;
  studentId: string;
  schoolId: string;
  status: 'pending' | 'approved' | 'rejected';
  message?: string;
  rejectionReason?: string;
  processedBy?: string;
  processedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  studentEmail?: string;
  schoolName?: string;
}

export interface EnrollmentStatusInfo {
  isEnrolled: boolean;
  requestStatus?: 'pending' | 'approved' | 'rejected';
  enrollmentDate?: Date;
  canBook: boolean;
}

export interface CreateEnrollmentRequestDTO {
  schoolId: string;
  message?: string;
}

class EnrollmentService {
  // Student: Request enrollment in a school
  async requestEnrollment(data: CreateEnrollmentRequestDTO): Promise<EnrollmentRequest> {
    const url = replaceUrlParams(API_CONFIG.ENDPOINTS.ENROLLMENT.REQUEST_ENROLLMENT, {
      schoolId: data.schoolId,
    });
    const response = await apiClient.post(url, { message: data.message });
    return response.data;
  }

  // Student: Get my enrollment requests
  async getMyRequests(): Promise<EnrollmentRequest[]> {
    const response = await apiClient.get(API_CONFIG.ENDPOINTS.ENROLLMENT.MY_REQUESTS);
    return response.data;
  }

  // Student: Check enrollment status in a school
  async checkEnrollmentStatus(schoolId: string): Promise<EnrollmentStatusInfo> {
    const url = replaceUrlParams(API_CONFIG.ENDPOINTS.ENROLLMENT.CHECK_STATUS, { schoolId });
    const response = await apiClient.get(url);
    return response.data;
  }

  // Instructor/Admin: Get school's enrollment requests
  async getSchoolRequests(schoolId: string, status?: string): Promise<EnrollmentRequest[]> {
    const url = replaceUrlParams(API_CONFIG.ENDPOINTS.ENROLLMENT.SCHOOL_REQUESTS, { schoolId });
    const response = await apiClient.get(url, { params: { status } });
    return response.data;
  }

  // Instructor/Admin: Approve enrollment request
  async approveRequest(requestId: string): Promise<EnrollmentRequest> {
    const url = replaceUrlParams(API_CONFIG.ENDPOINTS.ENROLLMENT.APPROVE, { requestId });
    const response = await apiClient.put(url);
    return response.data;
  }

  // Instructor/Admin: Reject enrollment request
  async rejectRequest(requestId: string, reason: string): Promise<EnrollmentRequest> {
    const url = replaceUrlParams(API_CONFIG.ENDPOINTS.ENROLLMENT.REJECT, { requestId });
    const response = await apiClient.put(url, { reason });
    return response.data;
  }
}

export const enrollmentService = new EnrollmentService();