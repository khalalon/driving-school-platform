/**
 * Auth Context
 * Single Responsibility: Manage authentication state globally
 * Provides: user, login, logout, register functions
 *
 * Session (D-12, D-19) : A1 / A2 donnent la paire de jetons, A3 (`/api/auth/me`) donne
 * l'identité — noms, rôle, et `schoolId` / `instructorId` pour un instructeur — stockée en
 * local et rafraîchie au démarrage. `logout` révoque la session côté serveur (A5) puis efface
 * le stockage local.
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

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/** Ce que l'app garde de A3 : rien de plus que le contrat. */
const toStoredUser = (me: User): User => ({
  id: me.id,
  email: me.email,
  firstName: me.firstName,
  lastName: me.lastName,
  role: me.role,
  schoolId: me.schoolId,
  instructorId: me.instructorId,
});

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

  /** A3, puis persistance locale. */
  const fetchAndStoreCurrentUser = async (): Promise<User> => {
    const me = await authService.getCurrentUser();
    const userData = toStoredUser(me);
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(userData));
    return userData;
  };

  const loadUserFromStorage = async () => {
    try {
      const [token, userJson] = await Promise.all([
        AsyncStorage.getItem(TOKEN_KEY),
        AsyncStorage.getItem(USER_KEY),
      ]);

      if (token && userJson) {
        // Copie locale d'abord (démarrage immédiat), puis A3 pour rafraîchir noms et école.
        // Sans réseau on garde la copie ; un 401 non rattrapable déconnecte via onSessionExpired.
        setUser(JSON.parse(userJson));
        fetchAndStoreCurrentUser()
          .then(setUser)
          .catch(() => undefined);
      }
    } catch (error) {
      console.error('Failed to load user from storage:', error);
    } finally {
      setIsLoading(false);
    }
  };

  /** Stocke la paire de jetons (refresh utilisé par ApiClient sur 401) puis charge l'identité (A3). */
  const openSession = async (tokens: AuthResponse) => {
    await apiClient.storeTokens({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    });
    try {
      setUser(await fetchAndStoreCurrentUser());
    } catch (error) {
      // Jetons valides mais identité injoignable : pas de session à moitié ouverte.
      await apiClient.clearSession();
      throw error;
    }
  };

  /** A1 puis A3. */
  const login = async (email: string, password: string) => {
    const response = await authService.login({ email, password });
    await openSession(response);
  };

  /** A2 puis A3 ; sans `schoolCode` le compte est un élève (D-17). */
  const register = async (data: RegisterRequest) => {
    const response = await authService.register(data);
    await openSession(response);
  };

  /** A5 (révocation serveur), puis effacement local dans tous les cas. */
  const logout = async () => {
    try {
      await authService.logout();
    } catch (error) {
      // Serveur injoignable ou session déjà expirée : on déconnecte quand même localement.
      console.warn('Logout: server-side revocation failed', error);
    }
    try {
      await apiClient.clearSession();
    } finally {
      setUser(null);
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
