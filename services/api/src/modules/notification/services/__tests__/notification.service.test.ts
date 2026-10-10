import { AuthUser, UserRole } from '../../../../types/auth';
import { IPushTokenRepository } from '../../repositories/push-token.repository';
import { NotificationService } from '../notification.service';

/** Un jeton n'appartient qu'à son porteur : le compte vient du jeton d'authentification. */
describe('NotificationService (17.2)', () => {
  const caller: AuthUser = { userId: 'user-1', email: 'e@x.io', role: UserRole.STUDENT };
  let pushTokens: jest.Mocked<IPushTokenRepository>;
  let service: NotificationService;

  beforeEach(() => {
    pushTokens = {
      upsert: jest.fn(),
      remove: jest.fn().mockResolvedValue(undefined),
      // Lus par le répartiteur (17.3), pas par ce service
      findByUsers: jest.fn(),
      removeByToken: jest.fn(),
    };
    service = new NotificationService(pushTokens);
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
});
