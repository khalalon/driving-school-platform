/**
 * Auth Service
 * Single Responsibility: Handle authentication API operations
 * Interface Segregation: Only auth-related methods
 */

import { apiClient } from './ApiClient';
import { API_CONFIG } from '../../config/api.config';
import { LoginRequest, RegisterRequest, AuthResponse } from '../../models/User';

class AuthService {
  /**
   * Login user
   */
  async login(data: LoginRequest): Promise<AuthResponse> {
    const response = await apiClient.post(
      `${API_CONFIG.AUTH_SERVICE}/auth/login`,
      data
    );
    return response.data;
  }

  /**
   * Register new user
   */
  async register(data: RegisterRequest): Promise<AuthResponse> {
    const response = await apiClient.post(
      `${API_CONFIG.AUTH_SERVICE}/auth/register`,
      data
    );
    return response.data;
  }

  /**
   * Logout user (client-side, clears token)
   */
  async logout(): Promise<void> {
    // Token clearing is handled in AuthContext
    return Promise.resolve();
  }

  /**
   * Get current user profile
   */
  async getCurrentUser(): Promise<AuthResponse['user']> {
    const response = await apiClient.get(
      `${API_CONFIG.AUTH_SERVICE}/auth/me`
    );
    return response.data;
  }
}

export const authService = new AuthService();
