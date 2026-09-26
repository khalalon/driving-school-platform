/**
 * Inscription détaillée (D-50) et fiche école tenue par son instructeur (D-51), de bout en bout.
 *
 * 1. Un élève s'inscrit **avec** ses coordonnées (A2) : elles vivent sur le compte tant qu'aucune
 *    école ne l'a accepté — la ligne `students` n'existe pas encore.
 * 2. L'école approuve (E5) : les coordonnées sont recopiées dans la fiche, et P1 les renvoie.
 * 3. L'instructeur corrige la fiche de **son** école (S7) et se voit refuser une autre école.
 */
import { api, bearer, expectStatus, SEED, uniqueEmail } from '../helpers/api';
import { ensureInstructorToken } from '../helpers/flow';

interface Tokens {
  accessToken: string;
}

interface Profile {
  id: string;
  firstName: string;
  lastName: string;
  phone?: string | null;
  address?: string | null;
  dateOfBirth?: string | null;
  emergencyContact?: string | null;
  emergencyPhone?: string | null;
}

/** Coordonnées saisies à l'inscription, telles qu'un élève les remplirait sur le téléphone. */
const DETAILS = {
  phone: '+216 20 123 456',
  dateOfBirth: '2001-03-09',
  address: '5 avenue Habib Bourguiba, Tunis',
  emergencyContact: 'Leila Cherif',
  emergencyPhone: '+216 20 999 888',
};

describe('inscription détaillée (D-50, D-51)', () => {
  let studentToken = '';
  let studentId = '';
  let instructorToken = '';

  beforeAll(async () => {
    instructorToken = await ensureInstructorToken();
  });

  test('A2 — un élève s’inscrit avec ses coordonnées : 201', async () => {
    const res = await api().post('/api/auth/register').send({
      email: uniqueEmail('e2e-details'),
      password: 'Passw0rd!',
      firstName: 'Nour',
      lastName: 'Cherif',
      ...DETAILS,
    });
    expectStatus(res, 201, 'A2 inscription avec coordonnées');
    studentToken = (res.body as Tokens).accessToken;

    const me = await api().get('/api/auth/me').set(bearer(studentToken));
    expectStatus(me, 200, 'A3 après inscription');
    studentId = (me.body as { id: string }).id;
  });

  test('A2 — une date de naissance dans le futur est refusée : 400', async () => {
    const future = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);

    const res = await api().post('/api/auth/register').send({
      email: uniqueEmail('e2e-details-future'),
      password: 'Passw0rd!',
      firstName: 'Nour',
      lastName: 'Cherif',
      dateOfBirth: future,
    });

    expectStatus(res, 400, 'A2 date de naissance future');
    expect((res.body as { error: string }).error).toBe('VALIDATION_ERROR');
  });

  test('E2 puis E5 — l’école approuve et la fiche élève reçoit les coordonnées (P1)', async () => {
    const requested = await api()
      .post(`/api/enrollment/schools/${SEED.schoolId}/request`)
      .set(bearer(studentToken))
      .send({ message: 'Inscription détaillée, test de bout en bout' });
    expectStatus(requested, 201, 'E2 demande');

    const requestId = (requested.body as { id: string }).id;
    const approved = await api()
      .put(`/api/enrollment/${requestId}/approve`)
      .set(bearer(instructorToken));
    expectStatus(approved, 200, 'E5 approbation');

    const profile = await api()
      .get(`/api/profiles/${studentId}/schools/${SEED.schoolId}/complete`)
      .set(bearer(instructorToken));
    expectStatus(profile, 200, 'P1 fiche élève');

    const body = profile.body as Profile;
    expect(body).toMatchObject({
      firstName: 'Nour',
      lastName: 'Cherif',
      phone: DETAILS.phone,
      address: DETAILS.address,
      emergencyContact: DETAILS.emergencyContact,
      emergencyPhone: DETAILS.emergencyPhone,
    });
    // `dateOfBirth` revient en date : seul le jour compte (le fuseau du serveur ne doit rien décaler)
    expect(String(body.dateOfBirth).slice(0, 10)).toBe(DETAILS.dateOfBirth);
  });

  test('S7 — l’instructeur corrige la fiche de son école : 200', async () => {
    const res = await api()
      .put(`/api/schools/${SEED.schoolId}`)
      .set(bearer(instructorToken))
      .send({ phone: '+21600000000' });

    expectStatus(res, 200, 'S7 mise à jour de son école');
    expect((res.body as { phone: string }).phone).toBe('+21600000000');
  });

  test('S7 — une autre école lui est refusée : 403 FORBIDDEN_SCHOOL', async () => {
    // Une école qui n'est pas la sienne ; l'identifiant existe côté format, pas en base
    const otherSchool = '99999999-9999-4999-8999-999999999999';

    const res = await api()
      .put(`/api/schools/${otherSchool}`)
      .set(bearer(instructorToken))
      .send({ phone: '+21600000001' });

    expectStatus(res, 403, 'S7 école étrangère');
    expect((res.body as { error: string }).error).toBe('FORBIDDEN_SCHOOL');
  });

  test('S7 — un élève n’a pas accès à la fiche école : 403', async () => {
    const res = await api()
      .put(`/api/schools/${SEED.schoolId}`)
      .set(bearer(studentToken))
      .send({ phone: '+21600000002' });

    expectStatus(res, 403, 'S7 élève');
  });
});
