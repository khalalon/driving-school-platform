/**
 * Notifications côté appareil (17.7). Ce qui compte : **rien ne fait échouer la connexion** —
 * pas de projet EAS, permission refusée, réseau absent : `null`, sans exception.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';

let mockProjectId: string | undefined = 'projet-eas';
jest.mock('expo-constants', () => ({
  __esModule: true,
  default: {
    get expoConfig() {
      return { extra: { eas: { projectId: mockProjectId } } };
    },
    easConfig: undefined,
  },
}));
jest.mock('../api/NotificationService', () => ({
  notificationService: {
    registerPushToken: jest.fn().mockResolvedValue(undefined),
    removePushToken: jest.fn().mockResolvedValue(undefined),
  },
}));

import { notificationService } from '../api/NotificationService';
import {
  configureForegroundNotifications,
  PUSH_TOKEN_KEY,
  registerForPush,
  targetOf,
  unregisterPush,
} from '../push';

const mocked = Notifications as jest.Mocked<typeof Notifications>;

describe('push (17.7)', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    mockProjectId = 'projet-eas';
    await AsyncStorage.clear();
    mocked.getPermissionsAsync.mockResolvedValue({ status: 'granted' } as never);
    mocked.getExpoPushTokenAsync.mockResolvedValue({ data: 'ExponentPushToken[t]' } as never);
  });

  it('permission accordée : le jeton part avec la langue courante, puis est retenu', async () => {
    await expect(registerForPush('ar')).resolves.toBe('ExponentPushToken[t]');

    expect(mocked.getExpoPushTokenAsync).toHaveBeenCalledWith({ projectId: 'projet-eas' });
    expect(notificationService.registerPushToken).toHaveBeenCalledWith({
      token: 'ExponentPushToken[t]',
      platform: expect.stringMatching(/^(android|ios)$/),
      language: 'ar',
    });
    await expect(AsyncStorage.getItem(PUSH_TOKEN_KEY)).resolves.toBe('ExponentPushToken[t]');
  });

  it('avant `eas init` (pas de projectId) : rien n’est demandé, pas même la permission', async () => {
    mockProjectId = undefined;

    await expect(registerForPush('fr')).resolves.toBeNull();
    expect(mocked.getPermissionsAsync).not.toHaveBeenCalled();
    expect(notificationService.registerPushToken).not.toHaveBeenCalled();
  });

  it('permission demandée seulement si besoin ; refusée → null, rien n’est envoyé', async () => {
    mocked.getPermissionsAsync.mockResolvedValue({ status: 'undetermined' } as never);
    mocked.requestPermissionsAsync.mockResolvedValue({ status: 'denied' } as never);

    await expect(registerForPush('fr')).resolves.toBeNull();
    expect(mocked.requestPermissionsAsync).toHaveBeenCalledTimes(1);
    expect(notificationService.registerPushToken).not.toHaveBeenCalled();
  });

  it('une erreur (réseau, Expo Go) ne remonte jamais', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    mocked.getExpoPushTokenAsync.mockRejectedValue(new Error('Expo Go ne reçoit plus les push'));

    await expect(registerForPush('fr')).resolves.toBeNull();
    warn.mockRestore();
  });

  it('logout : le jeton retenu est retiré (N2) puis oublié ; sans jeton, aucun appel', async () => {
    await AsyncStorage.setItem(PUSH_TOKEN_KEY, 'ExponentPushToken[t]');

    await unregisterPush();
    expect(notificationService.removePushToken).toHaveBeenCalledWith('ExponentPushToken[t]');
    await expect(AsyncStorage.getItem(PUSH_TOKEN_KEY)).resolves.toBeNull();

    await unregisterPush();
    expect(notificationService.removePushToken).toHaveBeenCalledTimes(1);
  });

  it('logout : un serveur injoignable n’empêche pas d’oublier le jeton', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    await AsyncStorage.setItem(PUSH_TOKEN_KEY, 'ExponentPushToken[t]');
    (notificationService.removePushToken as jest.Mock).mockRejectedValueOnce(new Error('hors ligne'));

    await expect(unregisterPush()).resolves.toBeUndefined();
    await expect(AsyncStorage.getItem(PUSH_TOKEN_KEY)).resolves.toBeNull();
    warn.mockRestore();
  });

  it('targetOf : la destination portée par la notification touchée', () => {
    const response = (data: unknown) =>
      ({ notification: { request: { content: { data } } } }) as never;

    expect(targetOf(response({ screen: 'MyLessons', id: 'l1' }))).toEqual({
      screen: 'MyLessons',
      id: 'l1',
    });
    expect(targetOf(response({ screen: 'Agenda', id: 42 }))).toEqual({
      screen: 'Agenda',
      id: undefined,
    });
    expect(targetOf(response({}))).toBeNull();
    expect(targetOf(null)).toBeNull();
  });

  it('au premier plan, la notification s’affiche quand même', async () => {
    configureForegroundNotifications();
    const [handler] = mocked.setNotificationHandler.mock.calls[0];
    await expect(handler?.handleNotification({} as never)).resolves.toMatchObject({
      shouldShowBanner: true,
    });
  });
});
