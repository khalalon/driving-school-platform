/**
 * Student Profile Service — §6 du contrat, vue instructeur (P1–P7).
 * `studentId` = users.id (D-28) ; cloisonné à l'école de l'instructeur (D-20).
 */

import { apiClient } from './ApiClient';
import { API_CONFIG, replaceUrlParams } from '../../config/api.config';
import {
  ExamHistory,
  FinancialSummary,
  LessonHistory,
  PaymentMethod,
  StudentProfile,
} from '../../models/Profile';

class StudentProfileService {
  /** P1. */
  async getCompleteProfile(studentId: string, schoolId: string): Promise<StudentProfile> {
    const url = replaceUrlParams(API_CONFIG.ENDPOINTS.PROFILES.COMPLETE, { studentId, schoolId });
    const response = await apiClient.get<StudentProfile>(url);
    return response.data;
  }

  /** P2. */
  async getStudentLessons(studentId: string, schoolId: string): Promise<LessonHistory[]> {
    const url = replaceUrlParams(API_CONFIG.ENDPOINTS.PROFILES.LESSONS, { studentId, schoolId });
    const response = await apiClient.get<LessonHistory[]>(url);
    return response.data;
  }

  /** P3. */
  async getStudentExams(studentId: string, schoolId: string): Promise<ExamHistory[]> {
    const url = replaceUrlParams(API_CONFIG.ENDPOINTS.PROFILES.EXAMS, { studentId, schoolId });
    const response = await apiClient.get<ExamHistory[]>(url);
    return response.data;
  }

  /** P4. */
  async getFinancialSummary(studentId: string, schoolId: string): Promise<FinancialSummary> {
    const url = replaceUrlParams(API_CONFIG.ENDPOINTS.PROFILES.FINANCIAL, { studentId, schoolId });
    const response = await apiClient.get<FinancialSummary>(url);
    return response.data;
  }

  /** P5 : note privée de l'instructeur (204). */
  async updateNotes(studentId: string, notes: string): Promise<void> {
    const url = replaceUrlParams(API_CONFIG.ENDPOINTS.PROFILES.UPDATE_NOTES, { studentId });
    await apiClient.put(url, { notes });
  }

  /** P6 : `lessonId` = lessons.id (204). */
  async markLessonPaid(
    lessonId: string,
    amount: number,
    paymentMethod: PaymentMethod
  ): Promise<void> {
    const url = replaceUrlParams(API_CONFIG.ENDPOINTS.PROFILES.MARK_LESSON_PAID, { lessonId });
    await apiClient.put(url, { amount, paymentMethod });
  }

  /** P7 : `examId` = exams.id (204). */
  async markExamPaid(examId: string, amount: number, paymentMethod: PaymentMethod): Promise<void> {
    const url = replaceUrlParams(API_CONFIG.ENDPOINTS.PROFILES.MARK_EXAM_PAID, { examId });
    await apiClient.put(url, { amount, paymentMethod });
  }
}

export const studentProfileService = new StudentProfileService();
