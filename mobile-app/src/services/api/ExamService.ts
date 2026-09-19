/**
 * Exam Service — §5 du contrat (X1–X5).
 * Single Responsibility: Handle exam-related API operations
 */

import { apiClient } from './ApiClient';
import { API_CONFIG, replaceUrlParams } from '../../config/api.config';
import {
  Exam,
  RecordExamResultData,
  RequestExamData,
  ScheduleExamData,
} from '../../models/Exam';

class ExamService {
  /** X1 : les examens de l'appelant (élève : les siens ; instructeur : tous ceux de son école). */
  async getMyExams(): Promise<Exam[]> {
    const response = await apiClient.get<Exam[]>(API_CONFIG.ENDPOINTS.EXAMS.LIST);
    return response.data;
  }

  /** X2 (élève) : demande adressée à l'école (403 `NOT_ENROLLED` sans inscription approuvée). */
  async requestExam(data: RequestExamData): Promise<Exam> {
    const response = await apiClient.post<Exam>(API_CONFIG.ENDPOINTS.EXAMS.REQUEST, data);
    return response.data;
  }

  /** X3 (instructeur de l'école). */
  async scheduleExam(examId: string, data: ScheduleExamData): Promise<Exam> {
    const url = replaceUrlParams(API_CONFIG.ENDPOINTS.EXAMS.SCHEDULE, { id: examId });
    const response = await apiClient.put<Exam>(url, data);
    return response.data;
  }

  /** X4 (instructeur de l'école) : motif de 10 à 500 caractères. */
  async rejectExamRequest(examId: string, reason: string): Promise<Exam> {
    const url = replaceUrlParams(API_CONFIG.ENDPOINTS.EXAMS.REJECT, { id: examId });
    const response = await apiClient.put<Exam>(url, { reason });
    return response.data;
  }

  /** X5 (instructeur de l'école) : `score` facultatif (D-33). */
  async recordExamResult(examId: string, data: RecordExamResultData): Promise<Exam> {
    const url = replaceUrlParams(API_CONFIG.ENDPOINTS.EXAMS.RESULT, { id: examId });
    const response = await apiClient.put<Exam>(url, data);
    return response.data;
  }
}

export const examService = new ExamService();
