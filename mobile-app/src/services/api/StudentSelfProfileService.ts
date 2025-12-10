/**
 * Student Self-Profile Service - Students viewing their own data
 */

import { apiClient } from './ApiClient';
import { API_CONFIG, replaceUrlParams } from '../../config/api.config';

export interface MyProfile {
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
}

export interface MyLessonHistory {
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
}

export interface MyExamHistory {
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
}

export interface MyFinancialSummary {
  totalRevenue: number;
  totalPending: number;
  totalDue: number;
  lessonsRevenue: number;
  examsRevenue: number;
  lessonsPending: number;
  examsPending: number;
  lastPaymentDate?: Date;
}

class StudentSelfProfileService {
  async getMyProfile(schoolId: string): Promise<MyProfile> {
    const url = replaceUrlParams(API_CONFIG.ENDPOINTS.STUDENT_PROFILES.MY_PROFILE, { schoolId });
    const response = await apiClient.get(url);
    return response.data;
  }

  async getMyLessons(schoolId: string): Promise<MyLessonHistory[]> {
    const url = replaceUrlParams(API_CONFIG.ENDPOINTS.STUDENT_PROFILES.MY_LESSONS, { schoolId });
    const response = await apiClient.get(url);
    return response.data;
  }

  async getMyExams(schoolId: string): Promise<MyExamHistory[]> {
    const url = replaceUrlParams(API_CONFIG.ENDPOINTS.STUDENT_PROFILES.MY_EXAMS, { schoolId });
    const response = await apiClient.get(url);
    return response.data;
  }

  async getMyFinancialSummary(schoolId: string): Promise<MyFinancialSummary> {
    const url = replaceUrlParams(API_CONFIG.ENDPOINTS.STUDENT_PROFILES.MY_FINANCIAL, { schoolId });
    const response = await apiClient.get(url);
    return response.data;
  }
}

export const studentSelfProfileService = new StudentSelfProfileService();
