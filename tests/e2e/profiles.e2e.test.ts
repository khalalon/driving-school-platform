/**
 * Fiches élève (P1–P11, D-28 : `:studentId` = users.id). Prérequis : un élève inscrit et approuvé
 * dans l'école du seed (helpers/flow.ts), l'instructeur du seed.
 */
import { api, bearer, expectStatus, SEED } from '../helpers/api';
import { ensureApprovedEnrollment, ensureInstructorToken, ensureStudent } from '../helpers/flow';

interface Profile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  totalLessons: number;
  completedLessons: number;
  totalExams: number;
  passedExams: number;
  notes?: string | null;
}

interface FinancialSummary {
  totalRevenue: number;
  totalPending: number;
  totalDue: number;
  lastPaymentDate: string | null;
}

describe('Fiches élève (P1–P11)', () => {
  let studentId = '';
  let studentToken = '';
  let instructorToken = '';

  beforeAll(async () => {
    const approved = await ensureApprovedEnrollment();
    studentId = approved.studentId; // users.id
    studentToken = (await ensureStudent()).token;
    instructorToken = await ensureInstructorToken();
  });

  test('P8 — l’élève approuvé lit sa propre fiche : 200, compteurs à zéro, sans notes', async () => {
    const res = await api()
      .get(`/api/student-profiles/me/schools/${SEED.schoolId}/profile`)
      .set(bearer(studentToken));
    expectStatus(res, 200, 'P8 ma fiche');
    const body = res.body as Profile;
    expect(body.id).toBe(studentId);
    expect(body).toMatchObject({ totalLessons: 0, completedLessons: 0, totalExams: 0, passedExams: 0 });
    expect(typeof body.firstName).toBe('string');
    expect(body).not.toHaveProperty('notes');
  });

  test('P1 — l’instructeur lit la fiche complète par users.id : 200 avec notes', async () => {
    const res = await api()
      .get(`/api/profiles/${studentId}/schools/${SEED.schoolId}/complete`)
      .set(bearer(instructorToken));
    expectStatus(res, 200, 'P1 fiche complète');
    const body = res.body as Profile;
    expect(body.id).toBe(studentId);
    expect(body).toHaveProperty('notes');
  });

  test('P5 — notes privées enregistrées (204) puis visibles en P1, jamais en P8', async () => {
    const put = await api()
      .put(`/api/profiles/${studentId}/notes`)
      .set(bearer(instructorToken))
      .send({ notes: 'Progresse bien en créneau.' });
    expectStatus(put, 204, 'P5 notes');

    const complete = await api()
      .get(`/api/profiles/${studentId}/schools/${SEED.schoolId}/complete`)
      .set(bearer(instructorToken));
    expect((complete.body as Profile).notes).toBe('Progresse bien en créneau.');

    const own = await api()
      .get(`/api/student-profiles/me/schools/${SEED.schoolId}/profile`)
      .set(bearer(studentToken));
    expect(own.body).not.toHaveProperty('notes');
  });

  test('P2/P3/P4 et P9/P10/P11 — historiques vides et résumé financier à zéro', async () => {
    for (const [label, path, token] of [
      ['P2', `/api/profiles/${studentId}/schools/${SEED.schoolId}/lessons`, instructorToken],
      ['P3', `/api/profiles/${studentId}/schools/${SEED.schoolId}/exams`, instructorToken],
      ['P9', `/api/student-profiles/me/schools/${SEED.schoolId}/lessons`, studentToken],
      ['P10', `/api/student-profiles/me/schools/${SEED.schoolId}/exams`, studentToken],
    ] as const) {
      const res = await api().get(path).set(bearer(token));
      expectStatus(res, 200, label);
      expect(res.body).toEqual([]);
    }

    for (const [label, path, token] of [
      ['P4', `/api/profiles/${studentId}/schools/${SEED.schoolId}/financial`, instructorToken],
      ['P11', `/api/student-profiles/me/schools/${SEED.schoolId}/financial`, studentToken],
    ] as const) {
      const res = await api().get(path).set(bearer(token));
      expectStatus(res, 200, label);
      expect(res.body as FinancialSummary).toMatchObject({
        totalRevenue: 0,
        totalPending: 0,
        totalDue: 0,
        lastPaymentDate: null,
      });
    }
  });

  test('P6/P7 — marquer payé une leçon ou un examen inconnu : 404 NOT_FOUND', async () => {
    const ghost = '00000000-0000-4000-8000-000000000000';
    const lesson = await api()
      .put(`/api/profiles/lessons/${ghost}/mark-paid`)
      .set(bearer(instructorToken))
      .send({ amount: 40, paymentMethod: 'cash' });
    expectStatus(lesson, 404, 'P6 leçon inconnue');
    const exam = await api()
      .put(`/api/profiles/exams/${ghost}/mark-paid`)
      .set(bearer(instructorToken))
      .send({ amount: 60, paymentMethod: 'cash' });
    expectStatus(exam, 404, 'P7 examen inconnu');
  });

  test('P8 — un élève sans inscription approuvée dans cette école : 404', async () => {
    const res = await api()
      .get(`/api/student-profiles/me/schools/00000000-0000-4000-8000-000000000000/profile`)
      .set(bearer(studentToken));
    expectStatus(res, 404, 'P8 école inconnue');
  });
});
