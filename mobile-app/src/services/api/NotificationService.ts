/**
 * Notification Service — §7 du contrat (N1 à N5). Ouvert à tout compte connecté : un jeton
 * push, comme une notification, n'appartient qu'à son porteur.
 */

import { apiClient } from './ApiClient';
import { API_CONFIG, replaceUrlParams } from '../../config/api.config';
import { AppNotification, RegisterPushTokenData } from '../../models/Notification';

class NotificationService {
  /** N1 : rejoué à chaque connexion et changement de langue (upsert sur le jeton). */
  async registerPushToken(data: RegisterPushTokenData): Promise<void> {
    await apiClient.put(API_CONFIG.ENDPOINTS.NOTIFICATIONS.PUSH_TOKEN, data);
  }

  /** N2 : au logout ; 204 même si le serveur n'avait plus le jeton. */
  async removePushToken(token: string): Promise<void> {
    // Axios n'envoie un corps avec DELETE que par `data`.
    await apiClient.delete(API_CONFIG.ENDPOINTS.NOTIFICATIONS.PUSH_TOKEN, { data: { token } });
  }

  /** N3 : les 50 dernières, ou les seules non lues (source du badge). */
  async getMine(unreadOnly = false): Promise<AppNotification[]> {
    const response = await apiClient.get<AppNotification[]>(
      API_CONFIG.ENDPOINTS.NOTIFICATIONS.LIST,
      unreadOnly ? { params: { unread: 'true' } } : undefined
    );
    return response.data;
  }

  /** N4 */
  async markRead(id: string): Promise<void> {
    await apiClient.put(replaceUrlParams(API_CONFIG.ENDPOINTS.NOTIFICATIONS.READ, { id }));
  }

  /** N5 */
  async markAllRead(): Promise<void> {
    await apiClient.put(API_CONFIG.ENDPOINTS.NOTIFICATIONS.READ_ALL);
  }
}

export const notificationService = new NotificationService();
