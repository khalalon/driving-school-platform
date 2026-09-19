/**
 * School Service — §2 du contrat (S1–S4 publics, S6 instructeur de l'école).
 * Single Responsibility: Handle school-related API operations
 */

import { apiClient } from './ApiClient';
import { API_CONFIG, replaceUrlParams } from '../../config/api.config';
import { School, SchoolInstructor, SchoolPricing, SchoolStudent } from '../../models/School';

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

  /** S6 : élèves autorisés de l'école, triés par nom (instructeur de cette école, D-25). */
  async getSchoolStudents(schoolId: string): Promise<SchoolStudent[]> {
    const url = replaceUrlParams(API_CONFIG.ENDPOINTS.SCHOOLS.STUDENTS, { id: schoolId });
    const response = await apiClient.get<SchoolStudent[]>(url);
    return response.data;
  }
}

// Export singleton instance
export const schoolService = new SchoolService();
