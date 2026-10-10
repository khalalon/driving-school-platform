import { AuthUser, UserRole } from '../../../../types/auth';
import { INotificationRepository } from '../../repositories/notification.repository';
import { IPushTokenRepository } from '../../repositories/push-token.repository';
import { NOTIFICATION_PAGE, NotificationService } from '../notification.service';

/** Un jeton n'appartient qu'à son porteur : le compte vient du jeton d'authentification. */
describe('NotificationService (17.2)', () => {
  const caller: AuthUser = { userId: 'user-1', email: 'e@x.io', role: UserRole.STUDENT };
  let pushTokens: jest.Mocked<IPushTokenRepository>;
  let history: jest.Mocked<INotificationRepository>;
  let service: NotificationService;

  beforeEach(() => {
    pushTokens = {
      upsert: jest.fn(),
      remove: jest.fn().mockResolvedValue(undefined),
      // Lus par le répartiteur (17.3), pas par ce service
      findByUsers: jest.fn(),
      removeByToken: jest.fn(),
    };
    history = {
      insert: jest.fn(),
      findByUser: jest.fn().mockResolvedValue([]),
      markRead: jest.fn().mockResolvedValue(true),
      markAllRead: jest.fn().mockResolvedValue(3),
    };
    service = new NotificationService(pushTokens, history);
  });

  it('N1 : l’appareil est enregistré pour l’appelant', async () => {
    const dto = {
      token: 'ExponentPushToken[x]',
      platform: 'android' as const,
      language: 'ar' as const,
    };
    pushTokens.upsert.mockResolvedValue({
      id: 't1',
      userId: caller.userId,
      ...dto,
      updatedAt: new Date(),
    });

    await expect(service.registerPushToken(caller, dto)).resolves.toMatchObject({ language: 'ar' });
    expect(pushTokens.upsert).toHaveBeenCalledWith('user-1', dto);
  });

  it('N2 : le retrait est silencieux, et borné au compte de l’appelant', async () => {
    await expect(service.removePushToken(caller, 'ExponentPushToken[x]')).resolves.toBeUndefined();
    expect(pushTokens.remove).toHaveBeenCalledWith('user-1', 'ExponentPushToken[x]');
  });

  it('N3 : les 50 dernières de l’appelant, ou ses seules non lues', async () => {
    await service.listMine(caller, false);
    expect(history.findByUser).toHaveBeenLastCalledWith('user-1', false, NOTIFICATION_PAGE);

    await service.listMine(caller, true);
    expect(history.findByUser).toHaveBeenLastCalledWith('user-1', true, 50);
  });

  it('N4 : marquer lu ; 404 si la notification n’existe pas ou n’est pas à l’appelant', async () => {
    await expect(service.markRead(caller, 'n1')).resolves.toBeUndefined();
    expect(history.markRead).toHaveBeenCalledWith('user-1', 'n1');

    history.markRead.mockResolvedValue(false);
    await expect(service.markRead(caller, 'n-d-un-autre')).rejects.toMatchObject({
      status: 404,
      code: 'NOT_FOUND',
    });
  });

  it('N5 : tout marquer lu, borné au compte de l’appelant', async () => {
    await expect(service.markAllRead(caller)).resolves.toBeUndefined();
    expect(history.markAllRead).toHaveBeenCalledWith('user-1');
  });
});
