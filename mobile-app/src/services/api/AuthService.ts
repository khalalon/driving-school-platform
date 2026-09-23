/**
 * Auth Service — §1 du contrat (A1, A2, A3, A5 ; A4 est joué par ApiClient).
 * Single Responsibility: Handle authentication API operations
 */

import { apiClient } from './ApiClient';
import { API_CONFIG } from '../../config/api.config';
import { AuthResponse, LoginRequest, RegisterRequest, User } from '../../models/User';

class AuthService {
  /** A1. */
  async login(data: LoginRequest): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>(API_CONFIG.ENDPOINTS.AUTH.LOGIN, data);
    return response.data;
  }

  /** A2 : le payload part tel quel (`firstName` / `lastName` exigés, `schoolCode` facultatif, jamais de `role`). */
  async register(data: RegisterRequest): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>(API_CONFIG.ENDPOINTS.AUTH.REGISTER, data);
    return response.data;
  }

  /** A3 : l'appelant, avec `schoolId` / `instructorId` pour un instructeur (D-19). */
  async getCurrentUser(): Promise<User> {
    const response = await apiClient.get<User>(API_CONFIG.ENDPOINTS.AUTH.ME);
    return response.data;
  }

  /** A5 : révoque la session du jeton présenté (204) ; le stockage local est effacé par AuthContext. */
  async logout(): Promise<void> {
    await apiClient.post(API_CONFIG.ENDPOINTS.AUTH.LOGOUT);
  }
}

export const authService = new AuthService();
