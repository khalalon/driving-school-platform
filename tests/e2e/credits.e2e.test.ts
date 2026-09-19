/**
 * Avoir de l'élève (D-40, tâche 7.2) et absence non facturée (D-41, tâche 7.3), sur la stack.
 *
 * Élève dédié (pas celui du chemin critique : ses compteurs financiers doivent rester à zéro
 * pour profiles.e2e.test.ts). Chaque bloc `describe` est autonome : `-t 'avoir'` ou
 * `-t 'absence'` rejouent leur propre mise en place.
 */
import { api, bearer, expectStatus, futureDate, SEED, step, uniqueEmail } from '../helpers/api';
import { ensureInstructorToken } from '../helpers/flow';

interface Lesson {
  id: string;
  status: string;
  price: number | null;
  paid: boolean;
  amount: number | null;
  paymentMethod: string | null;
  creditApplied: number;
  attended: boolean | null;
}

interface FinancialSummary {
  totalRevenue: number;
  totalDue: number;
  lessonsPending: number;
  credit: number;
}

/** Un élève inscrit et approuvé dans l'école du seed, avec ses jetons. */
async function enrolledStudent(): Promise<{ userId: string; token: string }> {
  const instructorToken = await ensureInstructorToken();
  const registered = await api().post('/api/auth/register').send({
    email: uniqueEmail('e2e-credit'),
    password: 'Student1234!',
    firstName: 'Crédit',
    lastName: 'Test',
  });
  expectStatus(registered, 201, 'prérequis A2');
  const token = (registered.body as { accessToken: string }).accessToken;

  const request = await api()
    .post(`/api/enrollment/schools/${SEED.schoolId}/request`)
    .set(bearer(token))
    .send({ message: 'Prérequis avoir / absence.' });
  expectStatus(request, 201, 'prérequis E2');
  const { id: requestId, studentId } = request.body as { id: string; studentId: string };

  const approved = await api()
    .put(`/api/enrollment/${requestId}/approve`)
    .set(bearer(instructorToken))
    .send();
  expectStatus(approved, 200, 'prérequis E5');
  return { userId: studentId, token };
}

async function financial(userId: string, instructorToken: string): Promise<FinancialSummary> {
  const res = await api()
    .get(`/api/profiles/${userId}/schools/${SEED.schoolId}/financial`)
    .set(bearer(instructorToken));
  expectStatus(res, 200, 'P4 résumé financier');
  return res.body as FinancialSummary;
}

async function requestAndSchedule(
  studentToken: string,
  instructorToken: string,
  type: string,
  day: number
): Promise<Lesson> {
  const requested = await api()
    .post('/api/lessons')
    .set(bearer(studentToken))
    .send({ type, requestedDate: futureDate(day) });
  expectStatus(requested, 201, `L2 demande ${type}`);
  const approved = await api()
    .put(`/api/lessons/${(requested.body as Lesson).id}/approve`)
    .set(bearer(instructorToken))
    .send({ scheduledDate: futureDate(day), durationMinutes: SEED.lessonDurationMinutes });
  expectStatus(approved, 200, `L5 planification ${type}`);
  return approved.body as Lesson;
}

describe('Avoir de l’élève (D-40)', () => {
  let instructorToken = '';
  let studentToken = '';
  let userId = '';
  let paidLesson: Lesson;
  let creditLesson: Lesson;

  beforeAll(async () => {
    instructorToken = await ensureInstructorToken();
    ({ userId, token: studentToken } = await enrolledStudent());
  });

  step('avoir — L5 planifie à 40 (grille Parc) sans avoir : rien d’imputé', async () => {
    paidLesson = await requestAndSchedule(studentToken, instructorToken, 'Parc', 5);
    expect(paidLesson).toMatchObject({
      status: 'scheduled',
      price: 40,
      paid: false,
      creditApplied: 0,
    });
    expect(await financial(userId, instructorToken)).toMatchObject({ credit: 0, totalDue: 40 });
  });

  step('avoir — P6 leçon payée 40 en espèces : encaissé 40, plus rien de dû', async () => {
    const paid = await api()
      .put(`/api/profiles/lessons/${paidLesson.id}/mark-paid`)
      .set(bearer(instructorToken))
      .send({ amount: 40, paymentMethod: 'cash' });
    expectStatus(paid, 204, 'P6 mark-paid');
    expect(await financial(userId, instructorToken)).toMatchObject({
      totalRevenue: 40,
      totalDue: 0,
      credit: 0,
    });
  });

  step('avoir — L3 annulation par l’école : le versement devient un avoir de 40, l’encaissé reste 40', async () => {
    const cancelled = await api()
      .post(`/api/lessons/${paidLesson.id}/cancel`)
      .set(bearer(instructorToken))
      .send({ reason: 'Voiture en panne' });
    expectStatus(cancelled, 200, 'L3 annulation');
    // La trace du paiement reste sur la leçon annulée : c'est l'argent réellement encaissé
    expect(cancelled.body as Lesson).toMatchObject({ status: 'cancelled', paid: true, amount: 40 });
    expect(await financial(userId, instructorToken)).toMatchObject({
      totalRevenue: 40,
      totalDue: 0,
      credit: 40,
    });
  });

  step('avoir — L5 suivante : réglée par l’avoir (paid, credit, amount 0, creditApplied 40), avoir à 0', async () => {
    creditLesson = await requestAndSchedule(studentToken, instructorToken, 'Parc', 6);
    expect(creditLesson).toMatchObject({
      status: 'scheduled',
      price: 40,
      paid: true,
      paymentMethod: 'credit',
      amount: 0,
      creditApplied: 40,
    });
    expect(await financial(userId, instructorToken)).toMatchObject({
      totalRevenue: 40,
      totalDue: 0,
      credit: 0,
    });
  });

  step('avoir — l’élève voit sa leçon réglée par l’avoir (L1) et son avoir (P11)', async () => {
    const lessons = await api().get('/api/lessons').set(bearer(studentToken));
    expectStatus(lessons, 200, 'L1');
    const mine = (lessons.body as Lesson[]).find((l) => l.id === creditLesson.id);
    expect(mine).toMatchObject({ paid: true, paymentMethod: 'credit', creditApplied: 40 });

    const own = await api()
      .get(`/api/student-profiles/me/schools/${SEED.schoolId}/financial`)
      .set(bearer(studentToken));
    expectStatus(own, 200, 'P11');
    expect(own.body as FinancialSummary).toMatchObject({ credit: 0, totalRevenue: 40 });
  });

  step('avoir — annuler la leçon réglée par l’avoir le restitue (40) ; L4 Manœuvre (35) l’impute, reste 5', async () => {
    const cancelled = await api()
      .post(`/api/lessons/${creditLesson.id}/cancel`)
      .set(bearer(studentToken))
      .send({});
    expectStatus(cancelled, 200, 'L3 annulation par l’élève (> 24 h)');
    expect(await financial(userId, instructorToken)).toMatchObject({ credit: 40 });

    const booked = await api()
      .post('/api/lessons/book-for-student')
      .set(bearer(instructorToken))
      .send({
        studentId: userId,
        type: 'Manœuvre',
        scheduledDate: futureDate(7),
        durationMinutes: SEED.lessonDurationMinutes,
      });
    expectStatus(booked, 201, 'L4 réservation directe');
    expect(booked.body as Lesson).toMatchObject({
      price: 35,
      paid: true,
      paymentMethod: 'credit',
      amount: 0,
      creditApplied: 35,
    });
    expect(await financial(userId, instructorToken)).toMatchObject({ credit: 5, totalDue: 0 });
  });

  step('avoir — avoir partiel (5) sur une leçon à 40 : creditApplied 5, reste dû 35, non payée, avoir à 0', async () => {
    const partial = await requestAndSchedule(studentToken, instructorToken, 'Parc', 8);
    expect(partial).toMatchObject({
      price: 40,
      paid: false,
      paymentMethod: null,
      amount: 35,
      creditApplied: 5,
    });
    expect(await financial(userId, instructorToken)).toMatchObject({
      credit: 0,
      totalDue: 35,
      lessonsPending: 35,
    });
  });
});

describe('Absence non facturée (D-41)', () => {
  let instructorToken = '';
  let userId = '';
  let unpaidLesson: Lesson;
  let prepaidLesson: Lesson;

  const book = async (day: number): Promise<Lesson> => {
    const booked = await api()
      .post('/api/lessons/book-for-student')
      .set(bearer(instructorToken))
      .send({
        studentId: userId,
        type: 'Parc',
        scheduledDate: futureDate(day),
        durationMinutes: SEED.lessonDurationMinutes,
      });
    expectStatus(booked, 201, 'L4 réservation directe');
    return booked.body as Lesson;
  };

  const markAbsent = async (lessonId: string): Promise<Lesson> => {
    const res = await api()
      .put(`/api/lessons/${lessonId}/attendance`)
      .set(bearer(instructorToken))
      .send({ attended: false });
    expectStatus(res, 200, 'L7 absence');
    return res.body as Lesson;
  };

  beforeAll(async () => {
    instructorToken = await ensureInstructorToken();
    ({ userId } = await enrolledStudent());
  });

  step('absence — deux leçons Parc réservées (L4) : 80 dus', async () => {
    unpaidLesson = await book(9);
    prepaidLesson = await book(10);
    expect(await financial(userId, instructorToken)).toMatchObject({
      totalDue: 80,
      lessonsPending: 80,
      credit: 0,
    });
  });

  step('absence — L7 attended=false sur la leçon non payée : completed, hors du dû', async () => {
    const absent = await markAbsent(unpaidLesson.id);
    expect(absent).toMatchObject({ status: 'completed', attended: false, paid: false });
    expect(await financial(userId, instructorToken)).toMatchObject({
      totalDue: 40,
      lessonsPending: 40,
      credit: 0,
    });
  });

  step('absence — P6 refuse de la marquer payée : 409 CONFLICT', async () => {
    const res = await api()
      .put(`/api/profiles/lessons/${unpaidLesson.id}/mark-paid`)
      .set(bearer(instructorToken))
      .send({ amount: 40, paymentMethod: 'cash' });
    expectStatus(res, 409, 'P6 sur une absence');
    expect(res.body).toMatchObject({ error: 'CONFLICT' });
  });

  step('absence — prépayée (P6 40) puis absente : le versement revient en avoir (40), encaissé 40, rien de dû', async () => {
    const paid = await api()
      .put(`/api/profiles/lessons/${prepaidLesson.id}/mark-paid`)
      .set(bearer(instructorToken))
      .send({ amount: 40, paymentMethod: 'card' });
    expectStatus(paid, 204, 'P6 prépaiement');

    const absent = await markAbsent(prepaidLesson.id);
    expect(absent).toMatchObject({ status: 'completed', attended: false, paid: true, amount: 40 });
    expect(await financial(userId, instructorToken)).toMatchObject({
      totalRevenue: 40,
      totalDue: 0,
      credit: 40,
    });
  });

  step('absence — le compteur de leçons effectuées reste à 0 (D-33) ; P2 montre les deux absences', async () => {
    const profile = await api()
      .get(`/api/profiles/${userId}/schools/${SEED.schoolId}/complete`)
      .set(bearer(instructorToken));
    expectStatus(profile, 200, 'P1');
    expect(profile.body as { completedLessons: number }).toMatchObject({ completedLessons: 0 });

    const history = await api()
      .get(`/api/profiles/${userId}/schools/${SEED.schoolId}/lessons`)
      .set(bearer(instructorToken));
    expectStatus(history, 200, 'P2');
    const absences = (history.body as Lesson[]).filter((l) => l.attended === false);
    expect(absences).toHaveLength(2);
  });
});
