/**
 * School Service
 * Single Responsibility: Handle school-related API operations
 * Interface Segregation: Only school-related methods
 */

import { apiClient } from './ApiClient';
import { API_CONFIG, replaceUrlParams } from '../../config/api.config';

export interface School {
  id: string;
  name: string;
  address: string;
  phone: string;
  email: string;
  description?: string;
  logo?: string;
  rating?: number;
  totalStudents?: number;
  totalInstructors?: number;
  createdAt: string;
}

export interface SchoolInstructor {
  id: string;
  userId: string;
  schoolId: string;
  name: string;
  phone: string;
  licenseNumber: string;
  specialties: string[];
  rating?: number;
  totalLessons?: number;
  yearsOfExperience?: number;
  bio?: string;
  avatar?: string;
}

export interface SchoolPricing {
  id: string;
  schoolId: string;
  lessonType: string;
  price: number;
  duration: number;
  currency: string;
}

export class SchoolService {
  async getAllSchools(): Promise<School[]> {
    return await apiClient.get<School[]>(API_CONFIG.ENDPOINTS.SCHOOLS.LIST);
  }

  async getSchoolById(schoolId: string): Promise<School> {
    const url = replaceUrlParams(API_CONFIG.ENDPOINTS.SCHOOLS.DETAIL, { id: schoolId });
    return await apiClient.get<School>(url);
  }

  async getSchoolInstructors(schoolId: string): Promise<SchoolInstructor[]> {
    const url = replaceUrlParams(API_CONFIG.ENDPOINTS.SCHOOLS.INSTRUCTORS, { id: schoolId });
    return await apiClient.get<SchoolInstructor[]>(url);
  }

  async getSchoolPricing(schoolId: string): Promise<SchoolPricing[]> {
    const url = replaceUrlParams(API_CONFIG.ENDPOINTS.SCHOOLS.PRICING, { id: schoolId });
    return await apiClient.get<SchoolPricing[]>(url);
  }

  async createSchool(data: Omit<School, 'id' | 'createdAt'>): Promise<School> {
    return await apiClient.post<School>(API_CONFIG.ENDPOINTS.SCHOOLS.CREATE, data);
  }

  async updateSchool(schoolId: string, data: Partial<School>): Promise<School> {
    const url = replaceUrlParams(API_CONFIG.ENDPOINTS.SCHOOLS.UPDATE, { id: schoolId });
    return await apiClient.put<School>(url, data);
  }

  async deleteSchool(schoolId: string): Promise<void> {
    const url = replaceUrlParams(API_CONFIG.ENDPOINTS.SCHOOLS.DELETE, { id: schoolId });
    return await apiClient.delete(url);
  }
}

// Export singleton instance
export const schoolService = new SchoolService();
