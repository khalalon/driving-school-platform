/**
 * Auth Context
 * Single Responsibility: Manage authentication state globally
 * Provides: user, login, logout, register functions
 */

import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiClient, TOKEN_KEY, USER_KEY } from '../services/api/ApiClient';
import { authService } from '../services/api/AuthService';
import { AuthResponse, RegisterRequest, User } from '../models/User';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
}

/**
 * Identité minimale lue dans l'access token (claims `userId`, `email`, `role`). Les noms et
 * l'école de l'instructeur viennent de A3 (`/api/auth/me`), câblé en 6.2.
 */
const userFromToken = (accessToken: string): User => {
  const decodedToken = JSON.parse(atob(accessToken.split('.')[1]));
  return {
    id: decodedToken.userId,
    email: decodedToken.email,
    role: decodedToken.role,
    firstName: '',
    lastName: '',
  };
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load user from storage on app start
  useEffect(() => {
    loadUserFromStorage();
  }, []);

  // Refresh token refusé (4.5) : la session locale est déjà effacée par ApiClient, on déconnecte.
  useEffect(() => {
    apiClient.onSessionExpired(() => setUser(null));
    return () => apiClient.onSessionExpired(null);
  }, []);

  const loadUserFromStorage = async () => {
    try {
      const [token, userJson] = await Promise.all([
        AsyncStorage.getItem(TOKEN_KEY),
        AsyncStorage.getItem(USER_KEY),
      ]);

      if (token && userJson) {
        const userData = JSON.parse(userJson);
        setUser(userData);
      }
    } catch (error) {
      console.error('Failed to load user from storage:', error);
    } finally {
      setIsLoading(false);
    }
  };

  /** Stocke la paire de jetons (refresh utilisé par ApiClient sur 401) et l'utilisateur. */
  const openSession = async (tokens: AuthResponse) => {
    const userData = userFromToken(tokens.accessToken);
    await Promise.all([
      apiClient.storeTokens({
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      }),
      AsyncStorage.setItem(USER_KEY, JSON.stringify(userData)),
    ]);
    setUser(userData);
  };

  /** A1 : `{ accessToken, refreshToken }`. */
  const login = async (email: string, password: string) => {
    const response = await authService.login({ email, password });
    await openSession(response);
  };

  /** A2 : même réponse que A1 ; sans `schoolCode` le compte est un élève (D-17). */
  const register = async (data: RegisterRequest) => {
    const response = await authService.register(data);
    await openSession(response);
  };

  const logout = async () => {
    try {
      // Clear storage (access, refresh, user)
      await apiClient.clearSession();

      setUser(null);
    } catch (error) {
      console.error('Logout failed:', error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, register }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
