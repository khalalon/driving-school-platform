/**
 * School Service — §2 du contrat (S1–S4 publics, S6 à S9 pour l'instructeur de l'école).
 * Single Responsibility: Handle school-related API operations
 */

import { apiClient } from './ApiClient';
import { API_CONFIG, replaceUrlParams } from '../../config/api.config';
import {
  School,
  SchoolInstructor,
  SchoolPricing,
  SchoolStudent,
  SetPricingRequest,
  UpdateSchoolRequest,
} from '../../models/School';

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

  /** S7 : l'instructeur corrige la fiche de **son** école (403 sur une autre, D-51). */
  async updateSchool(schoolId: string, data: UpdateSchoolRequest): Promise<School> {
    const url = replaceUrlParams(API_CONFIG.ENDPOINTS.SCHOOLS.DETAIL, { id: schoolId });
    const response = await apiClient.put<School>(url, data);
    return response.data;
  }

  /** S8 : ajoute ou remplace le tarif d'un type de leçon (upsert). */
  async setPricing(schoolId: string, data: SetPricingRequest): Promise<SchoolPricing> {
    const url = replaceUrlParams(API_CONFIG.ENDPOINTS.SCHOOLS.PRICING, { id: schoolId });
    const response = await apiClient.post<SchoolPricing>(url, data);
    return response.data;
  }

  /** S9 : retire un tarif ; une leçon déjà planifiée garde son prix figé (D-30). */
  async deletePricing(pricingId: string): Promise<void> {
    const url = replaceUrlParams(API_CONFIG.ENDPOINTS.SCHOOLS.PRICING_ITEM, { id: pricingId });
    await apiClient.delete(url);
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
