/**
 * Student Self-Profile Service — §6 du contrat, vue élève (P8–P11) : l'élève du jeton,
 * dans l'école `:schoolId` (son inscription active, D-22).
 */

import { apiClient } from './ApiClient';
import { API_CONFIG, replaceUrlParams } from '../../config/api.config';
import { ExamHistory, FinancialSummary, LessonHistory, MyProfile } from '../../models/Profile';

class StudentSelfProfileService {
  /** P8. */
  async getMyProfile(schoolId: string): Promise<MyProfile> {
    const url = replaceUrlParams(API_CONFIG.ENDPOINTS.STUDENT_PROFILES.MY_PROFILE, { schoolId });
    const response = await apiClient.get<MyProfile>(url);
    return response.data;
  }

  /** P9. */
  async getMyLessons(schoolId: string): Promise<LessonHistory[]> {
    const url = replaceUrlParams(API_CONFIG.ENDPOINTS.STUDENT_PROFILES.MY_LESSONS, { schoolId });
    const response = await apiClient.get<LessonHistory[]>(url);
    return response.data;
  }

  /** P10. */
  async getMyExams(schoolId: string): Promise<ExamHistory[]> {
    const url = replaceUrlParams(API_CONFIG.ENDPOINTS.STUDENT_PROFILES.MY_EXAMS, { schoolId });
    const response = await apiClient.get<ExamHistory[]>(url);
    return response.data;
  }

  /** P11. */
  async getMyFinancialSummary(schoolId: string): Promise<FinancialSummary> {
    const url = replaceUrlParams(API_CONFIG.ENDPOINTS.STUDENT_PROFILES.MY_FINANCIAL, {
      schoolId,
    });
    const response = await apiClient.get<FinancialSummary>(url);
    return response.data;
  }
}

export const studentSelfProfileService = new StudentSelfProfileService();
