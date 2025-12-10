/**
 * Student Profile Service - API calls
 * Single Responsibility: Handle student profile API requests
 */

import { apiClient } from './ApiClient';
import { API_CONFIG, replaceUrlParams } from '../../config/api.config';

export interface StudentProfile {
  id: string;
  userId: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  dateOfBirth?: Date;
  licenseNumber?: string;
  profilePhotoUrl?: string;
  enrollmentDate?: Date;
  emergencyContact?: string;
  emergencyPhone?: string;
  totalLessons: number;
  completedLessons: number;
  totalExams: number;
  passedExams: number;
  notes?: string;
}

export interface LessonHistory {
  id: string;
  lessonId: string;
  lessonType: string;
  dateTime: Date;
  duration: number;
  instructorName: string;
  attended?: boolean;
  feedback?: string;
  rating?: number;
  paid: boolean;
  amount?: number;
  paymentDate?: Date;
  paymentMethod?: string;
}

export interface ExamHistory {
  id: string;
  examId: string;
  examType: string;
  dateTime: Date;
  result?: string;
  score?: number;
  notes?: string;
  paid: boolean;
  amount?: number;
  paymentDate?: Date;
  paymentMethod?: string;
}

export interface FinancialSummary {
  totalRevenue: number;
  totalPending: number;
  totalDue: number;
  lessonsRevenue: number;
  examsRevenue: number;
  lessonsPending: number;
  examsPending: number;
  lastPaymentDate?: Date;
}

class StudentProfileService {
  async getCompleteProfile(studentId: string, schoolId: string): Promise<StudentProfile> {
    const url = replaceUrlParams(API_CONFIG.ENDPOINTS.PROFILES.COMPLETE, {
      studentId,
      schoolId,
    });
    const response = await apiClient.get(url);
    return response.data;
  }

  async getStudentLessons(studentId: string, schoolId: string): Promise<LessonHistory[]> {
    const url = replaceUrlParams(API_CONFIG.ENDPOINTS.PROFILES.LESSONS, {
      studentId,
      schoolId,
    });
    const response = await apiClient.get(url);
    return response.data;
  }

  async getStudentExams(studentId: string, schoolId: string): Promise<ExamHistory[]> {
    const url = replaceUrlParams(API_CONFIG.ENDPOINTS.PROFILES.EXAMS, {
      studentId,
      schoolId,
    });
    const response = await apiClient.get(url);
    return response.data;
  }

  async getFinancialSummary(studentId: string, schoolId: string): Promise<FinancialSummary> {
    const url = replaceUrlParams(API_CONFIG.ENDPOINTS.PROFILES.FINANCIAL, {
      studentId,
      schoolId,
    });
    const response = await apiClient.get(url);
    return response.data;
  }

  async updateNotes(studentId: string, notes: string): Promise<void> {
    const url = replaceUrlParams(API_CONFIG.ENDPOINTS.PROFILES.UPDATE_NOTES, { studentId });
    await apiClient.put(url, { notes });
  }

  async markLessonPaid(bookingId: string, amount: number, paymentMethod: string): Promise<void> {
    const url = replaceUrlParams(API_CONFIG.ENDPOINTS.PROFILES.MARK_LESSON_PAID, { bookingId });
    await apiClient.put(url, { amount, paymentMethod });
  }

  async markExamPaid(
    registrationId: string,
    amount: number,
    paymentMethod: string
  ): Promise<void> {
    const url = replaceUrlParams(API_CONFIG.ENDPOINTS.PROFILES.MARK_EXAM_PAID, { registrationId });
    await apiClient.put(url, { amount, paymentMethod });
  }
}

export const studentProfileService = new StudentProfileService();
