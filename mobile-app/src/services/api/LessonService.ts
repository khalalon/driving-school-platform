/**
 * Lesson Service
 * Single Responsibility: Handle lesson-related API operations
 * Request-based system with instructor booking capability
 */

import { apiClient } from './ApiClient';
import { API_CONFIG, replaceUrlParams } from '../../config/api.config';
import { Lesson, RequestLessonData, BookLessonForStudentData } from '../../models/Lesson';

interface Instructor {
  id: string;
  firstName: string;
  lastName: string;
  specializations: string[];
  rating: number;
  hourlyRate: number;
  yearsOfExperience: number;
}

export class LessonService {
  // Student methods
  async getInstructors(): Promise<Instructor[]> {
    return await apiClient.get<Instructor[]>(
      API_CONFIG.ENDPOINTS.LESSONS.INSTRUCTORS
    );
  }

  async requestLesson(data: RequestLessonData): Promise<Lesson> {
    return await apiClient.post<Lesson>(API_CONFIG.ENDPOINTS.LESSONS.CREATE, data);
  }

  async getMyLessons(): Promise<Lesson[]> {
    return await apiClient.get<Lesson[]>(API_CONFIG.ENDPOINTS.LESSONS.LIST);
  }

  async cancelLesson(lessonId: string): Promise<void> {
    const url = replaceUrlParams(API_CONFIG.ENDPOINTS.LESSONS.CANCEL, { id: lessonId });
    return await apiClient.post(url);
  }

  // Instructor methods
  async getLessonRequests(): Promise<Lesson[]> {
    return await apiClient.get<Lesson[]>(
      `${API_CONFIG.ENDPOINTS.LESSONS.LIST}/requests`
    );
  }

  async approveLesson(
    lessonId: string,
    data: { startTime: string; endTime: string; adminNotes?: string }
  ): Promise<Lesson> {
    const url = replaceUrlParams(API_CONFIG.ENDPOINTS.LESSONS.DETAIL, { id: lessonId });
    return await apiClient.put<Lesson>(`${url}/approve`, data);
  }

  async rejectLesson(lessonId: string, reason?: string): Promise<void> {
    const url = replaceUrlParams(API_CONFIG.ENDPOINTS.LESSONS.DETAIL, { id: lessonId });
    return await apiClient.put(`${url}/reject`, { reason });
  }

  async bookLessonForStudent(data: BookLessonForStudentData): Promise<Lesson> {
    return await apiClient.post<Lesson>(
      `${API_CONFIG.ENDPOINTS.LESSONS.CREATE}/book-for-student`,
      data
    );
  }

  async markAttendance(
    lessonId: string,
    data: { attended: boolean; feedback?: string; rating?: number }
  ): Promise<void> {
    const url = replaceUrlParams(API_CONFIG.ENDPOINTS.LESSONS.ATTENDANCE, { id: lessonId });
    return await apiClient.put(url, data);
  }

  async getTodayLessons(): Promise<Lesson[]> {
    return await apiClient.get<Lesson[]>(
      `${API_CONFIG.ENDPOINTS.LESSONS.LIST}/today`
    );
  }
}

// Export singleton instance
export const lessonService = new LessonService();
