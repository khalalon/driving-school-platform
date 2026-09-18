/**
 * Chemin critique v1 (D-15), sur les routes CIBLES de docs/API_CONTRACT.md :
 *   A2 register élève → E2 demande d'inscription → A1 login instructeur → E4 liste des demandes
 *   → E5 approbation → E1 statut (canBook) → L2 demande de leçon → L1 liste → L5 approbation
 *   → L7 présence.
 *
 * Chaque étape est un test nommé et dépend des précédentes : lancer avec `--bail`.
 * Tant que les phases 2 à 5 ne sont pas livrées, ce test ÉCHOUE à une étape métier — c'est
 * attendu (tâche 1.2) ; il devient bloquant en CI à la tâche 5.8.
 */
import {
  api,
  bearer,
  expectStatus,
  futureDate,
  login,
  SEED,
  step,
  uniqueEmail,
} from '../helpers/api';

interface EnrollmentRequest {
  id: string;
  studentId: string;
  schoolId: string;
  status: string;
  studentEmail?: string;
}

interface Lesson {
  id: string;
  status: string;
  type: string;
  instructorId: string | null;
  price?: number | string;
  attended?: boolean;
}

const student = {
  email: uniqueEmail(),
  password: 'Student1234!',
  firstName: 'Élève',
  lastName: 'Test',
};

let studentToken = '';
let instructorToken = '';
let requestId = '';
let lessonId = '';

describe('Chemin critique v1 (D-15)', () => {
  step('A2 — register élève { email, password, firstName, lastName }', async () => {
    const res = await api().post('/api/auth/register').send(student);
    expectStatus(res, 201, 'A2 register élève');
    expect(typeof res.body.accessToken).toBe('string');
    studentToken = res.body.accessToken as string;
  });

  step("E2 — l'élève demande à rejoindre l'école du seed", async () => {
    const res = await api()
      .post(`/api/enrollment/schools/${SEED.schoolId}/request`)
      .set(bearer(studentToken))
      .send({ message: 'Bonjour, je souhaite rejoindre votre auto-école.' });
    expectStatus(res, 201, 'E2 demande d’inscription');
    const body = res.body as EnrollmentRequest;
    expect(body.status).toBe('pending');
    expect(body.schoolId).toBe(SEED.schoolId);
    expect(typeof body.studentId).toBe('string');
    requestId = body.id;
  });

  step("A1 — login de l'instructeur du seed", async () => {
    const tokens = await login(SEED.instructor.email, SEED.instructor.password);
    instructorToken = tokens.accessToken;
  });

  step("E4 — la demande apparaît dans la liste de l'école, avec studentEmail", async () => {
    const res = await api()
      .get(`/api/enrollment/schools/${SEED.schoolId}/requests`)
      .query({ status: 'pending' })
      .set(bearer(instructorToken));
    expectStatus(res, 200, 'E4 liste des demandes');
    const mine = (res.body as EnrollmentRequest[]).find((r) => r.id === requestId);
    expect(mine).toBeDefined();
    expect(mine?.studentEmail).toBe(student.email);
  });

  step("E5 — l'instructeur approuve la demande", async () => {
    const res = await api()
      .put(`/api/enrollment/${requestId}/approve`)
      .set(bearer(instructorToken))
      .send();
    expectStatus(res, 200, 'E5 approbation');
    expect((res.body as EnrollmentRequest).status).toBe('approved');
  });

  step("E1 — l'élève est inscrit et peut réserver (canBook)", async () => {
    const res = await api()
      .get(`/api/enrollment/schools/${SEED.schoolId}/status`)
      .set(bearer(studentToken));
    expectStatus(res, 200, 'E1 statut');
    expect(res.body).toMatchObject({ isEnrolled: true, canBook: true });
  });

  step("L2 — l'élève demande une leçon Parc (pending, sans instructeur)", async () => {
    const res = await api()
      .post('/api/lessons')
      .set(bearer(studentToken))
      .send({
        type: 'Parc',
        requestedDate: futureDate(3),
        preferredInstructorId: SEED.instructor.instructorId,
        notes: 'Première leçon de parc.',
      });
    expectStatus(res, 201, 'L2 demande de leçon');
    const body = res.body as Lesson;
    expect(body.status).toBe('pending');
    expect(body.type).toBe('Parc');
    expect(body.instructorId).toBeNull();
    lessonId = body.id;
  });

  step("L1 — la leçon pending figure dans la liste de l'élève", async () => {
    const res = await api().get('/api/lessons').set(bearer(studentToken));
    expectStatus(res, 200, 'L1 liste des leçons');
    const mine = (res.body as Lesson[]).find((l) => l.id === lessonId);
    expect(mine).toBeDefined();
    expect(mine?.status).toBe('pending');
  });

  step("L5 — l'instructeur approuve : scheduled, prix de la grille Parc", async () => {
    const res = await api()
      .put(`/api/lessons/${lessonId}/approve`)
      .set(bearer(instructorToken))
      .send({ scheduledDate: futureDate(3), durationMinutes: SEED.lessonDurationMinutes });
    expectStatus(res, 200, 'L5 approbation de la leçon');
    const body = res.body as Lesson;
    expect(body.status).toBe('scheduled');
    expect(body.instructorId).toBe(SEED.instructor.instructorId);
    expect(Number(body.price)).toBe(SEED.pricing.Parc);
  });

  step("L7 — l'instructeur marque la présence : completed", async () => {
    const res = await api()
      .put(`/api/lessons/${lessonId}/attendance`)
      .set(bearer(instructorToken))
      .send({ attended: true });
    expectStatus(res, 200, 'L7 présence');
    const body = res.body as Lesson;
    expect(body.status).toBe('completed');
    expect(body.attended).toBe(true);
  });
});
