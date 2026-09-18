/**
 * Auth Context
 * Single Responsibility: Manage authentication state globally
 * Provides: user, login, logout, register functions
 */

import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiClient, TOKEN_KEY, USER_KEY } from '../services/api/ApiClient';
import { authService } from '../services/api/AuthService';
import { User, UserRole } from '../models/User';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
}

interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: UserRole; // Changed from string to UserRole
}

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

  const login = async (email: string, password: string) => {
    try {
      const response = await authService.login({ email, password });

      // Backend returns { accessToken, refreshToken } (contrat A1 / A2)
      // We need to decode the token to get user info
      const token = response.accessToken;

      // Decode JWT to get user info (simple decode)
      const decodedToken = JSON.parse(atob(token.split('.')[1]));

      // Create user object from token
      const userData: User = {
        id: decodedToken.userId,
        email: decodedToken.email,
        role: decodedToken.role,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Save both tokens (refresh utilisé par ApiClient sur 401) and user data
      await Promise.all([
        apiClient.storeTokens({ accessToken: token, refreshToken: response.refreshToken }),
        AsyncStorage.setItem(USER_KEY, JSON.stringify(userData)),
      ]);

      setUser(userData);
    } catch (error) {
      throw error;
    }
  };

  const register = async (data: RegisterData) => {
    try {
      const response = await authService.register(data);

      // Backend returns { accessToken, refreshToken } (contrat A1 / A2)
      // We need to decode the token to get user info
      const token = response.accessToken;

      // Decode JWT to get user info (simple decode)
      const decodedToken = JSON.parse(atob(token.split('.')[1]));

      // Create user object from token
      const userData: User = {
        id: decodedToken.userId,
        email: decodedToken.email,
        role: decodedToken.role,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Save both tokens (refresh utilisé par ApiClient sur 401) and user data
      await Promise.all([
        apiClient.storeTokens({ accessToken: token, refreshToken: response.refreshToken }),
        AsyncStorage.setItem(USER_KEY, JSON.stringify(userData)),
      ]);

      setUser(userData);
    } catch (error) {
      throw error;
    }
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
