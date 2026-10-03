/**
 * Gérant et moniteur, de bout en bout (14.5 — D-54, D-56, D-57).
 *
 * 1. Inscription avec le code gérant : le compte est un instructeur, `/me` dit `isManager: true`.
 * 2. Un simple moniteur de l'école ne touche plus la fiche ni la grille : 403 FORBIDDEN_MANAGER.
 * 3. Le gérant, lui, corrige la fiche (S7) et la grille (S8) de son école.
 * 4. Le gérant d'une autre école reste hors de celle-ci : 403 FORBIDDEN_SCHOOL.
 */
import { api, bearer, expectStatus, SEED, step, uniqueEmail } from '../helpers/api';
import { ensureInstructorToken } from '../helpers/flow';

interface Tokens {
  accessToken: string;
}

interface Me {
  role: string;
  schoolId?: string;
  instructorId?: string;
  isManager?: boolean;
}

/** Inscription d'un instructeur avec un code (A2 exige alors téléphone et permis). */
const registerWithCode = async (schoolCode: string, prefix: string): Promise<string> => {
  const res = await api()
    .post('/api/auth/register')
    .send({
      email: uniqueEmail(prefix),
      password: 'Passw0rd!',
      firstName: 'Sami',
      lastName: 'Gérant',
      phone: '+216 98 000 111',
      licenseNumber: `LIC-${Date.now()}`,
      schoolCode,
    });
  expectStatus(res, 201, `A2 inscription avec ${schoolCode}`);
  return (res.body as Tokens).accessToken;
};

describe('gérant et moniteur (D-54, D-56, D-57)', () => {
  let managerToken = '';
  let monitorToken = '';
  let otherManagerToken = '';

  beforeAll(async () => {
    monitorToken = await ensureInstructorToken();
  });

  step('A2 + A3 — inscription avec le code gérant : instructeur, isManager true', async () => {
    managerToken = await registerWithCode(SEED.managerCode, 'e2e-manager');

    const me = await api().get('/api/auth/me').set(bearer(managerToken));
    expectStatus(me, 200, 'A3 gérant');
    const body = me.body as Me;
    // Pas de rôle « manager » dans les comptes : le gérant est un instructeur (D-54)
    expect(body.role).toBe('instructor');
    expect(body.schoolId).toBe(SEED.schoolId);
    expect(body.instructorId).toBeTruthy();
    expect(body.isManager).toBe(true);
  });

  step('A3 — le moniteur de démo n’est pas gérant', async () => {
    const me = await api().get('/api/auth/me').set(bearer(monitorToken));
    expectStatus(me, 200, 'A3 moniteur');
    expect((me.body as Me).isManager).toBe(false);
  });

  step('S7 / S8 — un simple moniteur : 403 FORBIDDEN_MANAGER', async () => {
    const s7 = await api()
      .put(`/api/schools/${SEED.schoolId}`)
      .set(bearer(monitorToken))
      .send({ phone: '+21600000010' });
    expectStatus(s7, 403, 'S7 moniteur');
    expect((s7.body as { error: string }).error).toBe('FORBIDDEN_MANAGER');

    const s8 = await api()
      .post(`/api/schools/${SEED.schoolId}/pricing`)
      .set(bearer(monitorToken))
      .send({ lessonType: 'Parc', price: SEED.pricing.Parc, duration: SEED.lessonDurationMinutes });
    expectStatus(s8, 403, 'S8 moniteur');
    expect((s8.body as { error: string }).error).toBe('FORBIDDEN_MANAGER');
  });

  step('S7 / S8 — le gérant corrige la fiche et la grille de son école', async () => {
    const s7 = await api()
      .put(`/api/schools/${SEED.schoolId}`)
      .set(bearer(managerToken))
      .send({ phone: '+21600000000' });
    expectStatus(s7, 200, 'S7 gérant');
    expect((s7.body as { phone: string }).phone).toBe('+21600000000');

    // Même tarif que le seed : le chemin critique attend toujours ce prix
    const s8 = await api()
      .post(`/api/schools/${SEED.schoolId}/pricing`)
      .set(bearer(managerToken))
      .send({ lessonType: 'Parc', price: SEED.pricing.Parc, duration: SEED.lessonDurationMinutes });
    expectStatus(s8, 201, 'S8 gérant');
    expect(Number((s8.body as { price: number }).price)).toBe(SEED.pricing.Parc);
  });

  step('S7 — le gérant d’une autre école : 403 FORBIDDEN_SCHOOL', async () => {
    otherManagerToken = await registerWithCode(SEED.otherSchool.managerCode, 'e2e-other-manager');

    const res = await api()
      .put(`/api/schools/${SEED.schoolId}`)
      .set(bearer(otherManagerToken))
      .send({ phone: '+21600000011' });
    expectStatus(res, 403, 'S7 gérant d’une autre école');
    expect((res.body as { error: string }).error).toBe('FORBIDDEN_SCHOOL');
  });
});
