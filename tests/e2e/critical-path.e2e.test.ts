/**
 * Chemin critique v1 (D-15), sur les routes CIBLES de docs/API_CONTRACT.md :
 *   A2 register élève → E2 demande d'inscription → A1 login instructeur → E4 liste des demandes
 *   → E5 approbation → E1 statut (canBook) → L2 demande de leçon → L1 liste → L5 planification
 *   → L7 présence.
 *
 * Chaque étape est un test nommé. Dans une campagne complète (`--bail`), une étape en échec
 * bloque les suivantes (`step()`). Lancée seule (`-t '<étape>'`), une étape rejoue ses
 * prérequis via helpers/flow.ts.
 * Tant que les phases 4 et 5 ne sont pas livrées, la campagne complète ÉCHOUE à une étape
 * métier — c'est attendu (tâche 1.2) ; elle devient bloquante en CI à la tâche 5.8.
 */
import { api, bearer, expectStatus, futureDate, login, SEED, step } from '../helpers/api';
import {
  EnrollmentRequest,
  ensureApprovedEnrollment,
  ensureEnrollmentRequest,
  ensureInstructorToken,
  ensureLesson,
  ensureScheduledLesson,
  ensureStudent,
  Lesson,
  newStudent,
  rememberApproval,
  rememberEnrollmentRequest,
  rememberLesson,
  rememberScheduledLesson,
  rememberStudent,
} from '../helpers/flow';

describe('Chemin critique v1 (D-15)', () => {
  step('A2 — register élève { email, password, firstName, lastName }', async () => {
    const student = newStudent();
    const res = await api().post('/api/auth/register').send(student);
    expectStatus(res, 201, 'A2 register élève');
    expect(typeof res.body.accessToken).toBe('string');
    rememberStudent(student, res.body.accessToken as string);
  });

  step("E2 — l'élève demande à rejoindre l'école du seed", async () => {
    const { token } = await ensureStudent();
    const res = await api()
      .post(`/api/enrollment/schools/${SEED.schoolId}/request`)
      .set(bearer(token))
      .send({ message: 'Bonjour, je souhaite rejoindre votre auto-école.' });
    expectStatus(res, 201, 'E2 demande d’inscription');
    const body = res.body as EnrollmentRequest;
    expect(body.status).toBe('pending');
    expect(body.schoolId).toBe(SEED.schoolId);
    expect(typeof body.studentId).toBe('string');
    rememberEnrollmentRequest(body);
  });

  step("A1 — login de l'instructeur du seed", async () => {
    const tokens = await login(SEED.instructor.email, SEED.instructor.password);
    expect(typeof tokens.accessToken).toBe('string');
  });

  step("E4 — la demande apparaît dans la liste de l'école, avec l'identité de l'élève", async () => {
    const request = await ensureEnrollmentRequest();
    const { student } = await ensureStudent();
    const res = await api()
      .get(`/api/enrollment/schools/${SEED.schoolId}/requests`)
      .query({ status: 'pending' })
      .set(bearer(await ensureInstructorToken()));
    expectStatus(res, 200, 'E4 liste des demandes');
    const mine = (res.body as EnrollmentRequest[]).find((r) => r.id === request.id);
    expect(mine).toBeDefined();
    expect(mine).toMatchObject({
      studentEmail: student.email,
      studentFirstName: student.firstName,
      studentLastName: student.lastName,
    });
  });

  step("E5 — approbation de la demande par l'instructeur", async () => {
    const request = await ensureEnrollmentRequest();
    const res = await api()
      .put(`/api/enrollment/${request.id}/approve`)
      .set(bearer(await ensureInstructorToken()))
      .send();
    expectStatus(res, 200, 'E5 approbation');
    const body = res.body as EnrollmentRequest;
    expect(body.status).toBe('approved');
    rememberApproval(body);
  });

  step("E1 — l'élève est inscrit et peut réserver (canBook)", async () => {
    await ensureApprovedEnrollment();
    const { token } = await ensureStudent();
    const res = await api()
      .get(`/api/enrollment/schools/${SEED.schoolId}/status`)
      .set(bearer(token));
    expectStatus(res, 200, 'E1 statut');
    expect(res.body).toMatchObject({ isEnrolled: true, canBook: true });
  });

  step("L2 — l'élève demande une leçon Parc (pending, sans instructeur)", async () => {
    await ensureApprovedEnrollment();
    const { token } = await ensureStudent();
    const res = await api()
      .post('/api/lessons')
      .set(bearer(token))
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
    rememberLesson(body);
  });

  step("L1 — la leçon pending figure dans la liste de l'élève", async () => {
    const lesson = await ensureLesson();
    const { token } = await ensureStudent();
    const res = await api().get('/api/lessons').set(bearer(token));
    expectStatus(res, 200, 'L1 liste des leçons');
    const mine = (res.body as Lesson[]).find((l) => l.id === lesson.id);
    expect(mine).toBeDefined();
    expect(mine?.status).toBe('pending');
  });

  step("L5 — l'instructeur planifie la leçon : scheduled, prix de la grille Parc", async () => {
    const lesson = await ensureLesson();
    const res = await api()
      .put(`/api/lessons/${lesson.id}/approve`)
      .set(bearer(await ensureInstructorToken()))
      .send({ scheduledDate: futureDate(3), durationMinutes: SEED.lessonDurationMinutes });
    expectStatus(res, 200, 'L5 planification de la leçon');
    const body = res.body as Lesson;
    expect(body.status).toBe('scheduled');
    expect(body.instructorId).toBe(SEED.instructor.instructorId);
    expect(Number(body.price)).toBe(SEED.pricing.Parc);
    rememberScheduledLesson(body);
  });

  step("L7 — l'instructeur marque la présence : completed", async () => {
    const lesson = await ensureScheduledLesson();
    const res = await api()
      .put(`/api/lessons/${lesson.id}/attendance`)
      .set(bearer(await ensureInstructorToken()))
      .send({ attended: true });
    expectStatus(res, 200, 'L7 présence');
    const body = res.body as Lesson;
    expect(body.status).toBe('completed');
    expect(body.attended).toBe(true);
  });
});
