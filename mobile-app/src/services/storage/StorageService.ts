/**
 * Storage Service Interface
 * Dependency Inversion: Define contract, not implementation
 */

export interface IStorageService {
  setItem(key: string, value: string): Promise<void>;
  getItem(key: string): Promise<string | null>;
  removeItem(key: string): Promise<void>;
  clear(): Promise<void>;
}

/**
 * AsyncStorage Implementation
 * Single Responsibility: Handle device storage
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

export class AsyncStorageService implements IStorageService {
  async setItem(key: string, value: string): Promise<void> {
    await AsyncStorage.setItem(key, value);
  }

  async getItem(key: string): Promise<string | null> {
    return await AsyncStorage.getItem(key);
  }

  async removeItem(key: string): Promise<void> {
    await AsyncStorage.removeItem(key);
  }

  async clear(): Promise<void> {
    await AsyncStorage.clear();
  }
}

// Export singleton instance
export const storageService = new AsyncStorageService();
