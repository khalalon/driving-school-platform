/**
 * Notifications, de bout en bout (17.8 — D-63 à D-66), avec `NOTIFICATIONS_DRIVER=log` : aucun
 * push ne quitte la machine, mais l'historique est écrit pour de vrai et se lit par N3.
 *
 * 1. Un élève enregistre son appareil **en arabe** (N1).
 * 2. Sa demande d'inscription prévient l'école (E2) ; l'acceptation le prévient (E5).
 * 3. Sa demande de leçon, adressée à un instructeur, prévient **cet instructeur** (L2, D-64).
 * 4. L'approbation le prévient (L5), **en arabe** — la langue de son appareil (D-47), avec la
 *    destination qui ouvrira l'écran « Mes leçons ».
 * 5. Marquer lu (N4), refuser la notification d'un autre (404), tout marquer lu (N5), retirer
 *    l'appareil (N2).
 *
 * Instructeur propre à la campagne : il approuve une leçon, et les leçons laissées planifiées par
 * les campagnes précédentes provoqueraient un conflit d'horaire (D-58).
 */
import { api, bearer, expectStatus, futureDate, SEED, step, uniqueEmail } from '../helpers/api';
import { ensureCampaignInstructorToken } from '../helpers/flow';

interface Tokens {
  accessToken: string;
}

interface AppNotification {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  data: { screen: string; id?: string } | null;
}

/** Les notifications de l'appelant (N3), éventuellement les seules non lues. */
const notificationsOf = async (token: string, unread = false): Promise<AppNotification[]> => {
  const res = await api()
    .get(`/api/notifications${unread ? '?unread=true' : ''}`)
    .set(bearer(token));
  expectStatus(res, 200, 'N3 historique');
  return res.body as AppNotification[];
};

describe('notifications (D-63 à D-66)', () => {
  const pushToken = `ExponentPushToken[e2e-${Date.now()}]`;
  let instructorToken = '';
  let instructorId = '';
  let studentToken = '';
  let studentId = '';
  let lessonId = '';
  let scheduledNotificationId = '';

  beforeAll(async () => {
    instructorToken = await ensureCampaignInstructorToken();
    const me = await api().get('/api/auth/me').set(bearer(instructorToken));
    expectStatus(me, 200, 'A3 instructeur de campagne');
    instructorId = (me.body as { instructorId: string }).instructorId;
  });

  step('N1 — un élève enregistre son appareil, en arabe', async () => {
    const registered = await api()
      .post('/api/auth/register')
      .send({
        email: uniqueEmail('e2e-notif-student'),
        password: 'Passw0rd!',
        firstName: 'Nour',
        lastName: 'Notif',
      });
    expectStatus(registered, 201, 'A2 élève');
    studentToken = (registered.body as Tokens).accessToken;
    const me = await api().get('/api/auth/me').set(bearer(studentToken));
    studentId = (me.body as { id: string }).id;

    const res = await api()
      .put('/api/notifications/push-token')
      .set(bearer(studentToken))
      .send({ token: pushToken, platform: 'android', language: 'ar' });
    expectStatus(res, 200, 'N1 enregistrement');
    expect(res.body).toMatchObject({ userId: studentId, token: pushToken, language: 'ar' });

    // Rejouée (connexion suivante, changement de langue) : même appareil, aucune erreur
    const again = await api()
      .put('/api/notifications/push-token')
      .set(bearer(studentToken))
      .send({ token: pushToken, platform: 'android', language: 'ar' });
    expectStatus(again, 200, 'N1 rejouée');
    expect((again.body as { id: string }).id).toBe((res.body as { id: string }).id);
  });

  step('E2 prévient l’école ; E5 prévient l’élève, dans sa langue', async () => {
    const requested = await api()
      .post(`/api/enrollment/schools/${SEED.schoolId}/request`)
      .set(bearer(studentToken))
      .send({ message: 'Notifications, test de bout en bout' });
    expectStatus(requested, 201, 'E2 demande');
    const requestId = (requested.body as { id: string }).id;

    // Une demande d'inscription n'a pas d'instructeur préféré : toute l'école est prévenue
    const school = await notificationsOf(instructorToken, true);
    const enrollment = school.find((n) => n.data?.id === requestId);
    expect(enrollment).toMatchObject({
      type: 'enrollment_requested',
      data: { screen: 'EnrollmentRequests', id: requestId },
    });
    expect(enrollment?.message).toContain('Nour Notif');

    const approved = await api()
      .put(`/api/enrollment/${requestId}/approve`)
      .set(bearer(instructorToken))
      .send();
    expectStatus(approved, 200, 'E5 approbation');

    const mine = await notificationsOf(studentToken);
    const accepted = mine.find((n) => n.type === 'enrollment_approved');
    expect(accepted).toBeDefined();
    // Appareil enregistré en arabe : le titre n'est pas le texte français
    expect(accepted?.title).not.toBe('Inscription acceptée');
  });

  step('L2 — la demande adressée à un instructeur ne prévient que lui (D-64)', async () => {
    const requested = await api()
      .post('/api/lessons')
      .set(bearer(studentToken))
      .send({ type: 'Parc', requestedDate: futureDate(30, 8), preferredInstructorId: instructorId });
    expectStatus(requested, 201, 'L2 demande');
    lessonId = (requested.body as { id: string }).id;

    const forInstructor = (await notificationsOf(instructorToken, true)).find(
      (n) => n.data?.id === lessonId
    );
    expect(forInstructor).toMatchObject({
      type: 'lesson_requested',
      data: { screen: 'LessonRequests', id: lessonId },
    });
  });

  step('L5 — l’élève est prévenu, en arabe, avec la destination « Mes leçons »', async () => {
    // Minute impaire, dans un mois : aucune leçon d'une campagne précédente ne la chevauche
    const approved = await api()
      .put(`/api/lessons/${lessonId}/approve`)
      .set(bearer(instructorToken))
      .send({ scheduledDate: futureDate(30, 8).replace(':00:00', ':17:00'), durationMinutes: 60 });
    expectStatus(approved, 200, 'L5 approbation');

    const unread = await notificationsOf(studentToken, true);
    const scheduled = unread.find((n) => n.type === 'lesson_scheduled');
    expect(scheduled).toMatchObject({
      read: false,
      data: { screen: 'MyLessons', id: lessonId },
    });
    expect(scheduled?.title).toBe('تم تحديد الحصة');
    // Le type de leçon est traduit, pas recopié : « Parc » devient « الحلبة »
    expect(scheduled?.message).toContain('الحلبة');
    scheduledNotificationId = scheduled?.id ?? '';
  });

  step('N4 — marquer lu ; la notification d’un autre compte répond 404', async () => {
    const read = await api()
      .put(`/api/notifications/${scheduledNotificationId}/read`)
      .set(bearer(studentToken));
    expectStatus(read, 204, 'N4 élève');

    const unread = await notificationsOf(studentToken, true);
    expect(unread.some((n) => n.id === scheduledNotificationId)).toBe(false);

    // L'instructeur essaie de marquer la notification de l'élève : elle « n'existe pas » pour lui
    const foreign = await api()
      .put(`/api/notifications/${scheduledNotificationId}/read`)
      .set(bearer(instructorToken));
    expectStatus(foreign, 404, 'N4 notification d’un autre');
  });

  step('N5 — tout marquer lu ; N2 — l’appareil est retiré au logout', async () => {
    const all = await api().put('/api/notifications/read-all').set(bearer(studentToken));
    expectStatus(all, 204, 'N5');
    expect(await notificationsOf(studentToken, true)).toEqual([]);
    // L'historique, lui, reste
    expect((await notificationsOf(studentToken)).length).toBeGreaterThanOrEqual(2);

    const removed = await api()
      .delete('/api/notifications/push-token')
      .set(bearer(studentToken))
      .send({ token: pushToken });
    expectStatus(removed, 204, 'N2 retrait');

    // Rejoué : toujours 204, l'appareil n'a pas à savoir ce que le serveur avait encore
    const again = await api()
      .delete('/api/notifications/push-token')
      .set(bearer(studentToken))
      .send({ token: pushToken });
    expectStatus(again, 204, 'N2 rejoué');
  });
});
