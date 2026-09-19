/**
 * Lesson Service — §4 du contrat (L1–L7).
 * Single Responsibility: Handle lesson-related API operations
 */

import { apiClient } from './ApiClient';
import { API_CONFIG, replaceUrlParams } from '../../config/api.config';
import {
  ApproveLessonData,
  BookLessonForStudentData,
  Lesson,
  LessonFilters,
  MarkAttendanceData,
  RequestLessonData,
} from '../../models/Lesson';

/** Query de L1 : seules les clés fournies partent ; `status` multiple séparé par des virgules. */
const toQuery = (filters?: LessonFilters): Record<string, string> | undefined => {
  if (!filters) return undefined;
  const params: Record<string, string> = {};
  if (filters.status && filters.status.length > 0) params.status = filters.status.join(',');
  if (filters.scope) params.scope = filters.scope;
  if (filters.date) params.date = filters.date;
  return Object.keys(params).length > 0 ? params : undefined;
};

export class LessonService {
  // ----- Élève -----

  /** L2 : demande adressée à l'école (403 `NOT_ENROLLED` sans inscription approuvée). */
  async requestLesson(data: RequestLessonData): Promise<Lesson> {
    const response = await apiClient.post<Lesson>(API_CONFIG.ENDPOINTS.LESSONS.CREATE, data);
    return response.data;
  }

  /** L1 : les leçons de l'appelant (élève : les siennes ; instructeur : selon `scope`), triées par date. */
  async getMyLessons(filters?: LessonFilters): Promise<Lesson[]> {
    const params = toQuery(filters);
    const response = await apiClient.get<Lesson[]>(
      API_CONFIG.ENDPOINTS.LESSONS.LIST,
      params ? { params } : undefined
    );
    return response.data;
  }

  /** L3 : annulation (élève : sa leçon, fenêtre D-24 contrôlée par le serveur ; instructeur : toute leçon de son école). */
  async cancelLesson(lessonId: string, reason?: string): Promise<Lesson> {
    const url = replaceUrlParams(API_CONFIG.ENDPOINTS.LESSONS.CANCEL, { id: lessonId });
    const response = await apiClient.post<Lesson>(url, reason ? { reason } : {});
    return response.data;
  }

  // ----- Instructeur -----

  /** L5 : l'instructeur qui approuve devient l'instructeur de la leçon (D-32). */
  async approveLesson(lessonId: string, data: ApproveLessonData): Promise<Lesson> {
    const url = replaceUrlParams(API_CONFIG.ENDPOINTS.LESSONS.APPROVE, { id: lessonId });
    const response = await apiClient.put<Lesson>(url, data);
    return response.data;
  }

  /** L6 : motif de 10 à 500 caractères (D-29). */
  async rejectLesson(lessonId: string, reason: string): Promise<Lesson> {
    const url = replaceUrlParams(API_CONFIG.ENDPOINTS.LESSONS.REJECT, { id: lessonId });
    const response = await apiClient.put<Lesson>(url, { reason });
    return response.data;
  }

  /** L4 : réservation directe pour un élève inscrit (`studentId` = users.id, D-25). */
  async bookLessonForStudent(data: BookLessonForStudentData): Promise<Lesson> {
    const response = await apiClient.post<Lesson>(
      API_CONFIG.ENDPOINTS.LESSONS.BOOK_FOR_STUDENT,
      data
    );
    return response.data;
  }

  /** L7 : présence, par l'instructeur de la leçon seulement. */
  async markAttendance(lessonId: string, data: MarkAttendanceData): Promise<Lesson> {
    const url = replaceUrlParams(API_CONFIG.ENDPOINTS.LESSONS.ATTENDANCE, { id: lessonId });
    const response = await apiClient.put<Lesson>(url, data);
    return response.data;
  }
}

// Export singleton instance
export const lessonService = new LessonService();
