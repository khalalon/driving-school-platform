/**
 * Exam Service
 * Single Responsibility: Handle exam-related API operations
 */

import { apiClient } from './ApiClient';
import { API_CONFIG } from '../../config/api.config';
import { Exam } from '../../models/Exam';

class ExamService {
  async getMyExams(): Promise<Exam[]> {
    const response = await apiClient.get(`${API_CONFIG.EXAM_SERVICE}/my-exams`);
    return response.data;
  }

  async requestExam(data: {
    examType: string;
    preferredDate: string;
    message: string;
  }): Promise<Exam> {
    const response = await apiClient.post(
      `${API_CONFIG.EXAM_SERVICE}/request`,
      data
    );
    return response.data;
  }
}

export const examService = new ExamService();
