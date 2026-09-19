/**
 * School Service — §2 du contrat (S1–S4, lecture publique).
 * Single Responsibility: Handle school-related API operations
 */

import { apiClient } from './ApiClient';
import { API_CONFIG, replaceUrlParams } from '../../config/api.config';
import { School, SchoolInstructor, SchoolPricing } from '../../models/School';

export class SchoolService {
  /** S1. */
  async getAllSchools(): Promise<School[]> {
    const response = await apiClient.get<School[]>(API_CONFIG.ENDPOINTS.SCHOOLS.LIST);
    return response.data;
  }

  /** S2. */
  async getSchoolById(schoolId: string): Promise<School> {
    const url = replaceUrlParams(API_CONFIG.ENDPOINTS.SCHOOLS.DETAIL, { id: schoolId });
    const response = await apiClient.get<School>(url);
    return response.data;
  }

  /** S3. */
  async getSchoolInstructors(schoolId: string): Promise<SchoolInstructor[]> {
    const url = replaceUrlParams(API_CONFIG.ENDPOINTS.SCHOOLS.INSTRUCTORS, { id: schoolId });
    const response = await apiClient.get<SchoolInstructor[]>(url);
    return response.data;
  }

  /** S4. */
  async getSchoolPricing(schoolId: string): Promise<SchoolPricing[]> {
    const url = replaceUrlParams(API_CONFIG.ENDPOINTS.SCHOOLS.PRICING, { id: schoolId });
    const response = await apiClient.get<SchoolPricing[]>(url);
    return response.data;
  }
}

// Export singleton instance
export const schoolService = new SchoolService();
