/**
 * Exam Service
 * Single Responsibility: Handle exam-related API operations
 */

import { apiClient } from './ApiClient';
import { API_CONFIG } from '../../config/api.config';
import { Exam } from '../../models/Exam';

export interface RequestExamData {
  examType: 'THEORY' | 'PRACTICAL';
  preferredDate: string;
  message?: string;
}

export interface RecordExamResultData {
  result: 'PASS' | 'FAIL';
  score: number;
  notes?: string;
}

class ExamService {
  /**
   * Student: Get all available exams
   */
  async getMyExams(): Promise<Exam[]> {
    const response = await apiClient.get(API_CONFIG.ENDPOINTS.EXAMS.LIST);
    return response.data;
  }

  /**
   * Student: Request an exam
   */
  async requestExam(data: RequestExamData): Promise<Exam> {
    const response = await apiClient.post(
      API_CONFIG.ENDPOINTS.EXAMS.REQUEST,
      data
    );
    return response.data;
  }

  /**
   * Instructor: Get exam requests pending approval
   */
  async getExamRequests(): Promise<Exam[]> {
    const response = await apiClient.get(
      API_CONFIG.ENDPOINTS.EXAMS.REQUESTS
    );
    return response.data;
  }

  /**
   * Instructor: Schedule an exam (approve request)
   */
  async scheduleExam(
    examId: string,
    data: { dateTime: string; location: string }
  ): Promise<Exam> {
    const url = API_CONFIG.ENDPOINTS.EXAMS.SCHEDULE.replace(':id', examId);
    const response = await apiClient.put(url, data);
    return response.data;
  }

  /**
   * Instructor: Reject exam request
   */
  async rejectExamRequest(examId: string, reason: string): Promise<Exam> {
    const url = API_CONFIG.ENDPOINTS.EXAMS.REJECT.replace(':id', examId);
    const response = await apiClient.put(url, { reason });
    return response.data;
  }

  /**
   * Instructor: Record exam result
   */
  async recordExamResult(
    examId: string,
    data: RecordExamResultData
  ): Promise<Exam> {
    const url = API_CONFIG.ENDPOINTS.EXAMS.RESULT.replace(':id', examId);
    const response = await apiClient.put(url, data);
    return response.data;
  }

  /**
   * Instructor: Get today's scheduled exams
   */
  async getTodayExams(): Promise<Exam[]> {
    const response = await apiClient.get(
      API_CONFIG.ENDPOINTS.EXAMS.TODAY
    );
    return response.data;
  }
}

export const examService = new ExamService();