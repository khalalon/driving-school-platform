/**
 * Examens (X1–X5, D-01 / D-33) : l'élève approuvé demande un examen, l'école le voit dans sa
 * liste, le planifie, enregistre le résultat (5.6). Prérequis via helpers/flow.ts.
 */
import { api, bearer, expectStatus, futureDate, SEED, step } from '../helpers/api';
import { ensureApprovedEnrollment, ensureInstructorToken, ensureStudent } from '../helpers/flow';

interface Exam {
  id: string;
  schoolId: string;
  studentId: string;
  studentFirstName: string;
  studentCompletedLessons: number;
  type: string;
  status: string;
  preferredDate: string | null;
  dateTime: string | null;
  location: string | null;
  result: string;
  score: number | null;
  paid: boolean;
}

let examId = '';

describe('Examens (X1–X5)', () => {
  step("X2 — demande d'examen théorique par l'élève (pending)", async () => {
    const approved = await ensureApprovedEnrollment();
    const { token } = await ensureStudent();
    const res = await api()
      .post('/api/exams/request')
      .set(bearer(token))
      .send({ examType: 'theory', preferredDate: futureDate(10), message: 'Je me sens prêt.' });
    expectStatus(res, 201, "X2 demande d'examen");
    const body = res.body as Exam;
    expect(body).toMatchObject({
      status: 'pending',
      type: 'theory',
      result: 'pending',
      schoolId: SEED.schoolId,
      studentId: approved.studentId,
      dateTime: null,
      paid: false,
    });
    examId = body.id;
  });

  step("X1 — liste des examens de l'élève : la demande pending y figure", async () => {
    const { token } = await ensureStudent();
    const res = await api().get('/api/exams/my-exams').set(bearer(token));
    expectStatus(res, 200, 'X1 liste élève');
    const mine = (res.body as Exam[]).find((e) => e.id === examId);
    expect(mine).toBeDefined();
    expect(mine?.status).toBe('pending');
  });

  step("X1 — liste des examens de l'école pour l'instructeur, avec les leçons effectuées de l'élève", async () => {
    const res = await api()
      .get('/api/exams/my-exams')
      .query({ status: 'pending' })
      .set(bearer(await ensureInstructorToken()));
    expectStatus(res, 200, 'X1 liste école');
    const mine = (res.body as Exam[]).find((e) => e.id === examId);
    expect(mine).toBeDefined();
    expect(typeof mine?.studentFirstName).toBe('string');
    expect(typeof mine?.studentCompletedLessons).toBe('number');
  });

  step("X2 — un élève sans inscription approuvée est refusé (403 NOT_ENROLLED)", async () => {
    const outsider = await api().post('/api/auth/register').send({
      email: `e2e-outsider-${Date.now()}@seed.io`,
      password: 'Student1234!',
      firstName: 'Sans',
      lastName: 'École',
    });
    expectStatus(outsider, 201, 'A2 register outsider');
    const res = await api()
      .post('/api/exams/request')
      .set(bearer((outsider.body as { accessToken: string }).accessToken))
      .send({ examType: 'practical', preferredDate: futureDate(10) });
    expectStatus(res, 403, 'X2 sans inscription');
    expect(res.body).toMatchObject({ error: 'NOT_ENROLLED' });
  });
});
