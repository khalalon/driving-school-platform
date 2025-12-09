/**
 * School Code Service
 * Single Responsibility: Handle school code operations
 */

import { apiClient } from './ApiClient';
import { API_CONFIG } from '../../config/api.config';

export interface SchoolCode {
  id: string;
  schoolId: string;
  code: string;
  role: 'instructor' | 'student';
  maxUses?: number;
  usesCount: number;
  expiresAt?: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface VerifyCodeResult {
  schoolId: string;
  schoolName: string;
  role: string;
}

class SchoolCodeService {
  /**
   * Verify and use school code (Instructor registration)
   */
  async verifyCode(code: string): Promise<VerifyCodeResult> {
    const response = await apiClient.post(
      `${API_CONFIG.SCHOOL_SERVICE}/school-codes/verify`,
      { code }
    );
    return response.data;
  }

  /**
   * Get school codes (Admin)
   */
  async getSchoolCodes(schoolId: string): Promise<SchoolCode[]> {
    const response = await apiClient.get(
      `${API_CONFIG.SCHOOL_SERVICE}/schools/${schoolId}/codes`
    );
    return response.data;
  }
}

export const schoolCodeService = new SchoolCodeService();
