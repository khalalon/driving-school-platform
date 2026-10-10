/**
 * N1–N5 (17.7) : chemins, verbes, corps et `response.data`. N2 envoie son jeton dans le corps
 * d'un DELETE — Axios ne le fait que par `config.data`.
 */
import { mockApiClientModule, mockedApiClient, respond } from './mockApiClient';

jest.mock('../ApiClient', () => mockApiClientModule());

import { notificationService } from '../NotificationService';

describe('notificationService', () => {
  const api = mockedApiClient();

  beforeEach(() => jest.clearAllMocks());

  it('N1 / N2 : le jeton part avec la langue, et revient dans le corps du DELETE', async () => {
    api.put.mockResolvedValue(respond(undefined));
    api.delete.mockResolvedValue(respond(undefined, 204));

    await notificationService.registerPushToken({
      token: 'ExponentPushToken[x]',
      platform: 'android',
      language: 'ar',
    });
    expect(api.put).toHaveBeenCalledWith('/api/notifications/push-token', {
      token: 'ExponentPushToken[x]',
      platform: 'android',
      language: 'ar',
    });

    await notificationService.removePushToken('ExponentPushToken[x]');
    expect(api.delete).toHaveBeenCalledWith('/api/notifications/push-token', {
      data: { token: 'ExponentPushToken[x]' },
    });
  });

  it('N3 : tout l’historique, ou les seules non lues', async () => {
    const item = { id: 'n1', title: 'Leçon planifiée', read: false };
    api.get.mockResolvedValue(respond([item]));

    await expect(notificationService.getMine()).resolves.toEqual([item]);
    expect(api.get).toHaveBeenLastCalledWith('/api/notifications', undefined);

    await notificationService.getMine(true);
    expect(api.get).toHaveBeenLastCalledWith('/api/notifications', {
      params: { unread: 'true' },
    });
  });

  it('N4 / N5 : marquer lu, tout marquer lu', async () => {
    api.put.mockResolvedValue(respond(undefined, 204));

    await notificationService.markRead('n1');
    expect(api.put).toHaveBeenCalledWith('/api/notifications/n1/read');

    await notificationService.markAllRead();
    expect(api.put).toHaveBeenLastCalledWith('/api/notifications/read-all');
  });
});
