/**
 * Enrollment Service — §3 du contrat (E1–E6).
 * Single Responsibility: Handle enrollment-related API requests
 */

import { apiClient } from './ApiClient';
import { API_CONFIG, replaceUrlParams } from '../../config/api.config';
import {
  CreateEnrollmentRequestData,
  EnrollmentRequest,
  EnrollmentStatus,
  EnrollmentStatusInfo,
} from '../../models/Enrollment';

class EnrollmentService {
  /** E2 (élève) : demande d'inscription dans une école. */
  async requestEnrollment(data: CreateEnrollmentRequestData): Promise<EnrollmentRequest> {
    const url = replaceUrlParams(API_CONFIG.ENDPOINTS.ENROLLMENT.REQUEST_ENROLLMENT, {
      schoolId: data.schoolId,
    });
    const response = await apiClient.post<EnrollmentRequest>(url, { message: data.message });
    return response.data;
  }

  /** E3 (élève) : mes demandes, avec `schoolName`. */
  async getMyRequests(): Promise<EnrollmentRequest[]> {
    const response = await apiClient.get<EnrollmentRequest[]>(
      API_CONFIG.ENDPOINTS.ENROLLMENT.MY_REQUESTS
    );
    return response.data;
  }

  /** E1 (élève) : état de mon inscription dans une école. */
  async checkEnrollmentStatus(schoolId: string): Promise<EnrollmentStatusInfo> {
    const url = replaceUrlParams(API_CONFIG.ENDPOINTS.ENROLLMENT.CHECK_STATUS, { schoolId });
    const response = await apiClient.get<EnrollmentStatusInfo>(url);
    return response.data;
  }

  /** E4 (instructeur de l'école) : demandes de l'école, filtrables par statut. */
  async getSchoolRequests(
    schoolId: string,
    status?: EnrollmentStatus
  ): Promise<EnrollmentRequest[]> {
    const url = replaceUrlParams(API_CONFIG.ENDPOINTS.ENROLLMENT.SCHOOL_REQUESTS, { schoolId });
    const response = await apiClient.get<EnrollmentRequest[]>(url, {
      params: status ? { status } : undefined,
    });
    return response.data;
  }

  /** E5 (instructeur de l'école). */
  async approveRequest(requestId: string): Promise<EnrollmentRequest> {
    const url = replaceUrlParams(API_CONFIG.ENDPOINTS.ENROLLMENT.APPROVE, { requestId });
    const response = await apiClient.put<EnrollmentRequest>(url);
    return response.data;
  }

  /** E6 (instructeur de l'école) : motif de 10 à 500 caractères (D-29). */
  async rejectRequest(requestId: string, reason: string): Promise<EnrollmentRequest> {
    const url = replaceUrlParams(API_CONFIG.ENDPOINTS.ENROLLMENT.REJECT, { requestId });
    const response = await apiClient.put<EnrollmentRequest>(url, { reason });
    return response.data;
  }
}

export const enrollmentService = new EnrollmentService();
