/**
 * API Client
 * Single Responsibility: Handle HTTP requests with authentication
 * Open/Closed: Can be extended with interceptors without modification
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const TOKEN_KEY = '@auth_token';

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

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
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor - Handle errors
    this.client.interceptors.response.use(
      (response) => {
        return response;
      },
      async (error: AxiosError) => {
        if (error.response?.status === 401) {
          // Token expired or invalid - clear storage
          try {
            await AsyncStorage.multiRemove([TOKEN_KEY, '@auth_user']);
          } catch (e) {
            console.error('Failed to clear storage:', e);
          }
        }
        return Promise.reject(error);
      }
    );
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
