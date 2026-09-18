/**
 * API Client
 * Single Responsibility: Handle HTTP requests with authentication
 * Open/Closed: Can be extended with interceptors without modification
 *
 * Refresh token (D-12, tâche 4.5) : sur un 401, le client appelle `/api/auth/refresh` une seule
 * fois (appels concurrents partagés), stocke la nouvelle paire, rejoue la requête ; si le refresh
 * échoue, la session locale est effacée et `onSessionExpired` est prévenu (AuthContext déconnecte).
 */

import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_CONFIG } from '../../config/api.config';

export const TOKEN_KEY = '@auth_token';
export const REFRESH_TOKEN_KEY = '@auth_refresh_token';
export const USER_KEY = '@auth_user';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

type RetriableConfig = InternalAxiosRequestConfig & { _retry?: boolean };

export class ApiClient {
  private readonly client: AxiosInstance;
  private readonly refreshClient: AxiosInstance;
  private refreshing: Promise<string | null> | null = null;
  private sessionExpiredHandler: (() => void) | null = null;

  constructor(
    client: AxiosInstance = axios.create({
      baseURL: API_CONFIG.BASE_URL,
      timeout: 10000,
      headers: { 'Content-Type': 'application/json' },
    }),
    // Instance nue pour le refresh : sans intercepteurs, donc jamais de refresh en cascade.
    refreshClient: AxiosInstance = axios.create({
      baseURL: API_CONFIG.BASE_URL,
      timeout: 10000,
      headers: { 'Content-Type': 'application/json' },
    })
  ) {
    this.client = client;
    this.refreshClient = refreshClient;

    // Request interceptor - Add auth token
    this.client.interceptors.request.use(
      async (config) => {
        try {
          const token = await AsyncStorage.getItem(TOKEN_KEY);
          if (token) {
            config.headers.Authorization = `Bearer ${token}`;
          }
        } catch (error) {
          console.error('Failed to get token from storage:', error);
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor - 401 → refresh once, replay, or expire the session
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const config = error.config as RetriableConfig | undefined;
        if (error.response?.status !== 401 || !config || config._retry) {
          return Promise.reject(error);
        }
        config._retry = true;

        const accessToken = await this.refreshTokens();
        if (!accessToken) {
          return Promise.reject(error);
        }
        config.headers.Authorization = `Bearer ${accessToken}`;
        return this.client.request(config);
      }
    );
  }

  /** Prévenu quand le refresh échoue : la session locale est déjà effacée. */
  public onSessionExpired(handler: (() => void) | null): void {
    this.sessionExpiredHandler = handler;
  }

  public async storeTokens(tokens: TokenPair): Promise<void> {
    await AsyncStorage.multiSet([
      [TOKEN_KEY, tokens.accessToken],
      [REFRESH_TOKEN_KEY, tokens.refreshToken],
    ]);
  }

  public async clearSession(): Promise<void> {
    await AsyncStorage.multiRemove([TOKEN_KEY, REFRESH_TOKEN_KEY, USER_KEY]);
  }

  /**
   * Un seul refresh à la fois : les 401 concurrents attendent le même appel. Renvoie le nouvel
   * access token, ou `null` si la session est perdue (pas de refresh token, refresh refusé).
   */
  private refreshTokens(): Promise<string | null> {
    if (!this.refreshing) {
      this.refreshing = this.doRefresh().finally(() => {
        this.refreshing = null;
      });
    }
    return this.refreshing;
  }

  private async doRefresh(): Promise<string | null> {
    try {
      const refreshToken = await AsyncStorage.getItem(REFRESH_TOKEN_KEY);
      if (!refreshToken) {
        await this.expireSession();
        return null;
      }
      const response = await this.refreshClient.post<TokenPair>(
        API_CONFIG.ENDPOINTS.AUTH.REFRESH,
        { refreshToken }
      );
      await this.storeTokens(response.data);
      return response.data.accessToken;
    } catch (error) {
      await this.expireSession();
      return null;
    }
  }

  private async expireSession(): Promise<void> {
    try {
      await this.clearSession();
    } catch (error) {
      console.error('Failed to clear storage:', error);
    }
    this.sessionExpiredHandler?.();
  }

  public get client_instance(): AxiosInstance {
    return this.client;
  }

  // Convenience methods
  async get(url: string, config = {}) {
    return this.client.get(url, config);
  }

  async post(url: string, data = {}, config = {}) {
    return this.client.post(url, data, config);
  }

  async put(url: string, data = {}, config = {}) {
    return this.client.put(url, data, config);
  }

  async delete(url: string, config = {}) {
    return this.client.delete(url, config);
  }
}

export const apiClient = new ApiClient();
