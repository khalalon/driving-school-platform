/**
 * Enrollment Service
 * Single Responsibility: Handle enrollment-related API operations
 * Interface Segregation: Only enrollment methods
 */

import { apiClient } from './ApiClient';
import { API_CONFIG } from '../../config/api.config';
import { EnrollmentRequest, EnrollmentStatusInfo, CreateEnrollmentRequestDto } from '../../models/Enrollment';

class EnrollmentService {
  /**
   * Request enrollment in a school
   */
  async requestEnrollment(data: CreateEnrollmentRequestDto): Promise<EnrollmentRequest> {
    const response = await apiClient.post(
      `${API_CONFIG.SCHOOL_SERVICE}/schools/${data.schoolId}/enrollment/request`,
      { message: data.message }
    );
    return response.data;
  }

  /**
   * Get student's enrollment requests
   */
  async getMyRequests(): Promise<EnrollmentRequest[]> {
    const response = await apiClient.get(
      `${API_CONFIG.SCHOOL_SERVICE}/enrollment/my-requests`
    );
    return response.data;
  }

  /**
   * Check enrollment status for a school
   */
  async checkEnrollmentStatus(schoolId: string): Promise<EnrollmentStatusInfo> {
    const response = await apiClient.get(
      `${API_CONFIG.SCHOOL_SERVICE}/schools/${schoolId}/enrollment/status`
    );
    return response.data;
  }

  /**
   * Get pending enrollment requests for a school (Instructor/Admin)
   */
  async getSchoolRequests(schoolId: string, status?: string): Promise<EnrollmentRequest[]> {
    const params = status ? `?status=${status}` : '';
    const response = await apiClient.get(
      `${API_CONFIG.SCHOOL_SERVICE}/schools/${schoolId}/enrollment/requests${params}`
    );
    return response.data;
  }

  /**
   * Approve enrollment request (Instructor/Admin)
   */
  async approveRequest(requestId: string): Promise<EnrollmentRequest> {
    const response = await apiClient.put(
      `${API_CONFIG.SCHOOL_SERVICE}/enrollment/${requestId}/approve`
    );
    return response.data;
  }

  /**
   * Reject enrollment request (Instructor/Admin)
   */
  async rejectRequest(requestId: string, reason: string): Promise<EnrollmentRequest> {
    const response = await apiClient.put(
      `${API_CONFIG.SCHOOL_SERVICE}/enrollment/${requestId}/reject`,
      { reason }
    );
    return response.data;
  }
}

export const enrollmentService = new EnrollmentService();
