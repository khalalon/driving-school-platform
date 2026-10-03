/**
 * Créneaux libres, de bout en bout (15.10 — D-60).
 *
 * 1. Un instructeur publie une plage dans sa semaine type (I2) et la relit (I1).
 * 2. Un élève inscrit voit les créneaux de cette plage (L10), en UTC.
 * 3. Une leçon planifiée sur l'un d'eux le fait disparaître ; le suivant reste.
 * 4. Un élève non inscrit reçoit 403 NOT_ENROLLED.
 *
 * Instructeur et élèves propres à la campagne. Seuls les créneaux de cet instructeur sont
 * regardés : d'autres instructeurs de l'école de démo ont pu publier leurs plages.
 * Heures de l'école : Africa/Tunis = UTC+1 toute l'année (pas d'heure d'été depuis 2009).
 */
import { api, bearer, expectStatus, SEED, step, uniqueEmail } from '../helpers/api';

interface FreeSlot {
  start: string;
  end: string;
  instructorId: string;
  instructorFirstName: string;
}

const register = async (body: Record<string, string>, label: string): Promise<string> => {
  const res = await api()
    .post('/api/auth/register')
    .send({ password: 'Passw0rd!', ...body });
  expectStatus(res, 201, label);
  return (res.body as { accessToken: string }).accessToken;
};

/** Jour cible : dans 5 jours (dans la plage de 14 jours de L10), jour civil de Tunis. */
const target = new Date(Date.now() + 5 * 86_400_000);
const tunisDay = new Date(target.getTime() + 3_600_000); // décalage de Tunis
const [year, month, date] = [tunisDay.getUTCFullYear(), tunisDay.getUTCMonth(), tunisDay.getUTCDate()];
const weekday = tunisDay.getUTCDay();
/** 10:00 et 11:00 à Tunis = 09:00 et 10:00 UTC. */
const tenAm = new Date(Date.UTC(year, month, date, 9, 0)).toISOString();
const elevenAm = new Date(Date.UTC(year, month, date, 10, 0)).toISOString();

describe('créneaux libres (D-60)', () => {
  let instructorToken = '';
  let instructorId = '';
  let studentToken = '';
  let studentId = '';

  const freeSlots = async (token: string) =>
    api()
      .get('/api/lessons/free-slots')
      .query({
        type: 'Parc',
        from: new Date().toISOString(),
        to: new Date(Date.now() + 14 * 86_400_000).toISOString(),
      })
      .set(bearer(token));

  /** Les créneaux de cet instructeur le jour cible (la fenêtre de 14 jours en contient deux). */
  const mine = (slots: FreeSlot[]) =>
    slots.filter(
      (slot) => slot.instructorId === instructorId && slot.start.slice(0, 10) === tenAm.slice(0, 10)
    );

  beforeAll(async () => {
    instructorToken = await register(
      {
        email: uniqueEmail('e2e-slots-instructor'),
        firstName: 'Lina',
        lastName: 'Créneaux',
        phone: '+216 98 555 666',
        licenseNumber: `LIC-SL-${Date.now()}`,
        schoolCode: SEED.schoolCode,
      },
      'A2 instructeur'
    );
    const me = await api().get('/api/auth/me').set(bearer(instructorToken));
    expectStatus(me, 200, 'A3 instructeur');
    instructorId = (me.body as { instructorId: string }).instructorId;

    studentToken = await register(
      { email: uniqueEmail('e2e-slots-student'), firstName: 'Rania', lastName: 'Créneaux' },
      'A2 élève'
    );
    const request = await api()
      .post(`/api/enrollment/schools/${SEED.schoolId}/request`)
      .set(bearer(studentToken))
      .send({ message: 'Créneaux.' });
    expectStatus(request, 201, 'E2');
    const enrollment = request.body as { id: string; studentId: string };
    studentId = enrollment.studentId;
    const approved = await api()
      .put(`/api/enrollment/${enrollment.id}/approve`)
      .set(bearer(instructorToken))
      .send();
    expectStatus(approved, 200, 'E5');
  });

  step('I2 / I1 — l’instructeur publie 10:00–12:00 et relit sa semaine type', async () => {
    const put = await api()
      .put('/api/instructors/me/availability')
      .set(bearer(instructorToken))
      .send({ slots: [{ weekday, startTime: '10:00', endTime: '12:00' }] });
    expectStatus(put, 200, 'I2 semaine type');

    const get = await api().get('/api/instructors/me/availability').set(bearer(instructorToken));
    expectStatus(get, 200, 'I1 semaine type');
    expect(get.body).toEqual([{ weekday, startTime: '10:00', endTime: '12:00' }]);
  });

  step('L10 — l’élève voit les créneaux de 10:00 et 11:00 (heure de l’école), en UTC', async () => {
    const res = await freeSlots(studentToken);
    expectStatus(res, 200, 'L10 créneaux');
    const slots = mine(res.body as FreeSlot[]);
    expect(slots.map((slot) => slot.start)).toEqual([tenAm, elevenAm]);
    expect(slots[0].end).toBe(elevenAm);
    expect(slots[0].instructorFirstName).toBe('Lina');
  });

  step('L4 puis L10 — une leçon planifiée à 10:00 fait disparaître ce créneau', async () => {
    const booked = await api()
      .post('/api/lessons/book-for-student')
      .set(bearer(instructorToken))
      .send({
        studentId,
        type: 'Parc',
        scheduledDate: tenAm,
        durationMinutes: SEED.lessonDurationMinutes,
      });
    expectStatus(booked, 201, 'L4 sur le créneau');

    const res = await freeSlots(studentToken);
    expectStatus(res, 200, 'L10 après la leçon');
    expect(mine(res.body as FreeSlot[]).map((slot) => slot.start)).toEqual([elevenAm]);
  });

  step('L10 — un élève sans inscription approuvée : 403 NOT_ENROLLED', async () => {
    const outsider = await register(
      { email: uniqueEmail('e2e-slots-outsider'), firstName: 'Hors', lastName: 'École' },
      'A2 élève non inscrit'
    );
    const res = await freeSlots(outsider);
    expectStatus(res, 403, 'L10 non inscrit');
    expect((res.body as { error: string }).error).toBe('NOT_ENROLLED');
  });

  step('L10 — plage de plus de 14 jours : 400 VALIDATION_ERROR', async () => {
    const res = await api()
      .get('/api/lessons/free-slots')
      .query({
        type: 'Parc',
        from: new Date().toISOString(),
        to: new Date(Date.now() + 15 * 86_400_000).toISOString(),
      })
      .set(bearer(studentToken));
    expectStatus(res, 400, 'L10 plage trop longue');
  });
});
