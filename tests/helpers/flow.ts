/**
 * Prérequis mémorisés du chemin critique.
 *
 * Chaque étape de `e2e/critical-path.e2e.test.ts` doit pouvoir s'exécuter seule
 * (`jest e2e/critical-path -t '<étape>'`) : elle obtient ses prérequis via `ensure*()`, qui
 * rejoue silencieusement les étapes amont manquantes. Dans une campagne complète, chaque étape
 * enregistre son résultat avec `remember*()` et rien n'est rejoué.
 */
import { api, bearer, expectStatus, futureDate, login, SEED, uniqueEmail } from './api';

export interface StudentAccount {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface EnrollmentRequest {
  id: string;
  studentId: string;
  schoolId: string;
  status: string;
  studentEmail?: string;
  studentFirstName?: string;
  studentLastName?: string;
}

export interface Lesson {
  id: string;
  status: string;
  type: string;
  studentId: string;
  instructorId: string | null;
  price?: number | string;
  attended?: boolean;
}

export const newStudent = (): StudentAccount => ({
  email: uniqueEmail(),
  password: 'Student1234!',
  firstName: 'Élève',
  lastName: 'Test',
});

const cache: {
  student?: StudentAccount;
  studentToken?: string;
  instructorToken?: string;
  request?: EnrollmentRequest;
  approved?: EnrollmentRequest;
  lesson?: Lesson;
  scheduled?: Lesson;
} = {};

export function rememberStudent(student: StudentAccount, accessToken: string): void {
  cache.student = student;
  cache.studentToken = accessToken;
}

/** A2 rejoué comme prérequis (payload du contrat : sans `role`, 4.1). */
export async function ensureStudent(): Promise<{ student: StudentAccount; token: string }> {
  if (cache.student && cache.studentToken) {
    return { student: cache.student, token: cache.studentToken };
  }
  const student = newStudent();
  const res = await api().post('/api/auth/register').send(student);
  expectStatus(res, 201, 'prérequis A2 register élève');
  const token = (res.body as { accessToken: string }).accessToken;
  rememberStudent(student, token);
  return { student, token };
}

export async function ensureInstructorToken(): Promise<string> {
  if (!cache.instructorToken) {
    const tokens = await login(SEED.instructor.email, SEED.instructor.password);
    cache.instructorToken = tokens.accessToken;
  }
  return cache.instructorToken;
}

export function rememberEnrollmentRequest(request: EnrollmentRequest): void {
  cache.request = request;
}

/** E2 rejoué comme prérequis. */
export async function ensureEnrollmentRequest(): Promise<EnrollmentRequest> {
  if (cache.request) {
    return cache.request;
  }
  const { token } = await ensureStudent();
  const res = await api()
    .post(`/api/enrollment/schools/${SEED.schoolId}/request`)
    .set(bearer(token))
    .send({ message: 'Prérequis du chemin critique.' });
  expectStatus(res, 201, 'prérequis E2 demande d’inscription');
  const request = res.body as EnrollmentRequest;
  rememberEnrollmentRequest(request);
  return request;
}

export function rememberApproval(request: EnrollmentRequest): void {
  cache.approved = request;
}

/** E5 rejoué comme prérequis. */
export async function ensureApprovedEnrollment(): Promise<EnrollmentRequest> {
  if (cache.approved) {
    return cache.approved;
  }
  const request = await ensureEnrollmentRequest();
  const res = await api()
    .put(`/api/enrollment/${request.id}/approve`)
    .set(bearer(await ensureInstructorToken()))
    .send();
  expectStatus(res, 200, 'prérequis E5 approbation');
  const approved = res.body as EnrollmentRequest;
  rememberApproval(approved);
  return approved;
}

export function rememberLesson(lesson: Lesson): void {
  cache.lesson = lesson;
}

/** L2 rejoué comme prérequis (route cible : demande de leçon, D-21). */
export async function ensureLesson(): Promise<Lesson> {
  if (cache.lesson) {
    return cache.lesson;
  }
  await ensureApprovedEnrollment();
  const { token } = await ensureStudent();
  const res = await api()
    .post('/api/lessons')
    .set(bearer(token))
    .send({
      type: 'Parc',
      requestedDate: futureDate(3),
      preferredInstructorId: SEED.instructor.instructorId,
      notes: 'Prérequis du chemin critique.',
    });
  expectStatus(res, 201, 'prérequis L2 demande de leçon');
  const lesson = res.body as Lesson;
  rememberLesson(lesson);
  return lesson;
}

export function rememberScheduledLesson(lesson: Lesson): void {
  cache.scheduled = lesson;
}

/** L5 rejoué comme prérequis. */
export async function ensureScheduledLesson(): Promise<Lesson> {
  if (cache.scheduled) {
    return cache.scheduled;
  }
  const lesson = await ensureLesson();
  const res = await api()
    .put(`/api/lessons/${lesson.id}/approve`)
    .set(bearer(await ensureInstructorToken()))
    .send({ scheduledDate: futureDate(3), durationMinutes: SEED.lessonDurationMinutes });
  expectStatus(res, 200, 'prérequis L5 planification de la leçon');
  const scheduled = res.body as Lesson;
  rememberScheduledLesson(scheduled);
  return scheduled;
}
