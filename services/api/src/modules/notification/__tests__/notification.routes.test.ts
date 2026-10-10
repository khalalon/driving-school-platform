import request from 'supertest';
import { createApp } from '../../../app';
import { bearerFor, TEST_USERS, testRequireAuth, UUID } from '../../../test-utils/http';
import { NotificationController } from '../controllers/notification.controller';
import { createNotificationRouter } from '../routes/notification.routes';
import { NotificationService } from '../services/notification.service';

/**
 * N1 / N2 (17.2) : tout utilisateur connecté enregistre son appareil ; un visiteur non
 * authentifié, non. Les valeurs de `platform` et `language` sont fermées (migration 018 les
 * contraint aussi en base : un 500 serait le signe d'une validation oubliée).
 */
describe('Routes /api/notifications (N1, N2)', () => {
  const notificationService = {
    registerPushToken: jest.fn(),
    removePushToken: jest.fn(),
  };
  const app = createApp({
    auth: createNotificationRouter(
      new NotificationController(notificationService as unknown as NotificationService),
      testRequireAuth
    ),
  });
  const base = '/api/auth';
  const token = 'ExponentPushToken[abcdefghijklmnop]';
  const saved = { id: UUID.request, userId: TEST_USERS.student.userId, token };

  beforeEach(() => jest.clearAllMocks());

  it('N1 : un élève enregistre son appareil ; le compte vient du jeton, pas du payload', async () => {
    notificationService.registerPushToken.mockResolvedValue(saved);

    const res = await request(app)
      .put(`${base}/push-token`)
      .set('Authorization', bearerFor('student'))
      .send({ token, platform: 'android', language: 'ar' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual(saved);
    expect(notificationService.registerPushToken).toHaveBeenCalledWith(
      expect.objectContaining({ userId: TEST_USERS.student.userId, role: 'student' }),
      { token, platform: 'android', language: 'ar' }
    );
  });

  it('N1 : un instructeur aussi — aucune route n’est réservée à un rôle', async () => {
    notificationService.registerPushToken.mockResolvedValue(saved);

    await request(app)
      .put(`${base}/push-token`)
      .set('Authorization', bearerFor('instructor'))
      .send({ token, platform: 'ios', language: 'fr' })
      .expect(200);
    expect(notificationService.registerPushToken).toHaveBeenCalledTimes(1);
  });

  it('N1 : plateforme ou langue inconnue, jeton trop court → 400 VALIDATION_ERROR', async () => {
    for (const body of [
      { token, platform: 'windows', language: 'fr' },
      { token, platform: 'android', language: 'en' },
      { token: 'court', platform: 'android', language: 'fr' },
      { platform: 'android', language: 'fr' },
    ]) {
      const res = await request(app)
        .put(`${base}/push-token`)
        .set('Authorization', bearerFor('student'))
        .send(body);
      expect({ body, status: res.status }).toEqual({ body, status: 400 });
      expect((res.body as { error: string }).error).toBe('VALIDATION_ERROR');
    }
    expect(notificationService.registerPushToken).not.toHaveBeenCalled();
  });

  it('N2 : retrait au logout → 204, même si le jeton n’était plus là', async () => {
    notificationService.removePushToken.mockResolvedValue(undefined);

    await request(app)
      .delete(`${base}/push-token`)
      .set('Authorization', bearerFor('student'))
      .send({ token })
      .expect(204);
    expect(notificationService.removePushToken).toHaveBeenCalledWith(
      expect.objectContaining({ userId: TEST_USERS.student.userId }),
      token
    );
  });

  it('N1 / N2 : sans jeton d’authentification → 401', async () => {
    await request(app)
      .put(`${base}/push-token`)
      .send({ token, platform: 'android', language: 'fr' })
      .expect(401);
    await request(app).delete(`${base}/push-token`).send({ token }).expect(401);
    expect(notificationService.registerPushToken).not.toHaveBeenCalled();
    expect(notificationService.removePushToken).not.toHaveBeenCalled();
  });
});
