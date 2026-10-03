/**
 * Agenda et conflits d'horaire, de bout en bout (15.5 — D-58, D-59).
 *
 * 1. Deux leçons qui se chevauchent pour le même instructeur → 409 SCHEDULE_CONFLICT avec la
 *    leçon en conflit, puis acceptée avec `force: true`.
 * 2. Même contrôle pour un même élève, avec un autre instructeur.
 * 3. L9 renvoie les leçons de la semaine pour toute l'école, filtrables par instructeur.
 * 4. Un instructeur d'une autre école ne lit pas cet agenda : 403 FORBIDDEN_SCHOOL.
 *
 * Instructeurs et élèves propres à la campagne : les leçons laissées planifiées par les
 * campagnes précédentes ne doivent pas créer de faux conflits.
 */
import { api, bearer, expectStatus, futureDate, SEED, step, uniqueEmail } from '../helpers/api';

interface Lesson {
  id: string;
  status: string;
  instructorId: string | null;
  studentId: string;
  scheduledDate: string;
}

interface ConflictBody {
  error: string;
  conflict: {
    lessonId: string;
    instructorId: string;
    studentId: string;
    student: { firstName: string; lastName: string };
  };
}

const register = async (body: Record<string, string>, label: string): Promise<string> => {
  const res = await api()
    .post('/api/auth/register')
    .send({ password: 'Passw0rd!', ...body });
  expectStatus(res, 201, label);
  return (res.body as { accessToken: string }).accessToken;
};

/** Instructeur inscrit avec un code d'école (A2 exige alors téléphone et permis). */
const newInstructor = (schoolCode: string, firstName: string): Promise<string> =>
  register(
    {
      email: uniqueEmail('e2e-agenda-instructor'),
      firstName,
      lastName: 'Agenda',
      phone: '+216 98 333 444',
      licenseNumber: `LIC-AG-${Date.now()}-${firstName}`,
      schoolCode,
    },
    `A2 instructeur ${firstName}`
  );

/** Élève inscrit et approuvé dans l'école de démo ; renvoie son users.id. */
const newEnrolledStudent = async (firstName: string, instructorToken: string): Promise<string> => {
  const token = await register(
    { email: uniqueEmail('e2e-agenda-student'), firstName, lastName: 'Agenda' },
    `A2 élève ${firstName}`
  );
  const request = await api()
    .post(`/api/enrollment/schools/${SEED.schoolId}/request`)
    .set(bearer(token))
    .send({ message: 'Agenda.' });
  expectStatus(request, 201, `E2 ${firstName}`);
  const { id, studentId } = request.body as { id: string; studentId: string };
  const approved = await api()
    .put(`/api/enrollment/${id}/approve`)
    .set(bearer(instructorToken))
    .send();
  expectStatus(approved, 200, `E5 ${firstName}`);
  return studentId;
};

const instructorIdOf = async (token: string): Promise<string> => {
  const me = await api().get('/api/auth/me').set(bearer(token));
  expectStatus(me, 200, 'A3');
  return (me.body as { instructorId: string }).instructorId;
};

/** L4 : réservation directe d'une leçon de 60 min. */
const book = (token: string, studentId: string, scheduledDate: string, force?: boolean) =>
  api()
    .post('/api/lessons/book-for-student')
    .set(bearer(token))
    .send({
      studentId,
      type: 'Parc',
      scheduledDate,
      durationMinutes: SEED.lessonDurationMinutes,
      ...(force === undefined ? {} : { force }),
    });

describe('agenda et conflits (D-58, D-59)', () => {
  // Mardi de la semaine dans 3 semaines, 9 h UTC : loin des autres fichiers
  const nineAm = futureDate(21, 9);
  const nineThirty = new Date(new Date(nineAm).getTime() + 30 * 60_000).toISOString();
  const nineFifteen = new Date(new Date(nineAm).getTime() + 15 * 60_000).toISOString();

  let karim = '';
  let sami = '';
  let karimId = '';
  let samiId = '';
  let yasmine = '';
  let nour = '';
  const lessonIds: string[] = [];

  beforeAll(async () => {
    karim = await newInstructor(SEED.schoolCode, 'Karim');
    sami = await newInstructor(SEED.schoolCode, 'Sami');
    karimId = await instructorIdOf(karim);
    samiId = await instructorIdOf(sami);
    yasmine = await newEnrolledStudent('Yasmine', karim);
    nour = await newEnrolledStudent('Nour', karim);
  });

  step('L4 — première leçon de Karim avec Yasmine à 9 h : 201', async () => {
    const res = await book(karim, yasmine, nineAm);
    expectStatus(res, 201, 'L4 première leçon');
    lessonIds.push((res.body as Lesson).id);
  });

  step('L4 — Karim, même créneau (9 h 30) avec Nour : 409 SCHEDULE_CONFLICT, puis forcé', async () => {
    const refused = await book(karim, nour, nineThirty);
    expectStatus(refused, 409, 'L4 chevauchement instructeur');
    const body = refused.body as ConflictBody;
    expect(body.error).toBe('SCHEDULE_CONFLICT');
    expect(body.conflict.lessonId).toBe(lessonIds[0]);
    expect(body.conflict.instructorId).toBe(karimId);
    expect(body.conflict.studentId).toBe(yasmine);
    expect(body.conflict.student.firstName).toBe('Yasmine');

    const forced = await book(karim, nour, nineThirty, true);
    expectStatus(forced, 201, 'L4 chevauchement forcé');
    lessonIds.push((forced.body as Lesson).id);
  });

  step('L4 — Sami, à 9 h 15 avec Yasmine déjà prise : 409 sur l’élève', async () => {
    const refused = await book(sami, yasmine, nineFifteen);
    expectStatus(refused, 409, 'L4 chevauchement élève');
    const body = refused.body as ConflictBody;
    expect(body.error).toBe('SCHEDULE_CONFLICT');
    expect(body.conflict.studentId).toBe(yasmine);
    expect(body.conflict.instructorId).toBe(karimId);
  });

  step('L5 — l’approbation est contrôlée de la même façon', async () => {
    // Nour demande une leçon ; Sami l'approuve sur le créneau où Nour est déjà prise (9 h 30)
    const nourToken = await register(
      { email: uniqueEmail('e2e-agenda-nour2'), firstName: 'Nour2', lastName: 'Agenda' },
      'A2 élève Nour2'
    );
    const request = await api()
      .post(`/api/enrollment/schools/${SEED.schoolId}/request`)
      .set(bearer(nourToken))
      .send({ message: 'Agenda L5.' });
    expectStatus(request, 201, 'E2 Nour2');
    const enrollment = request.body as { id: string };
    const approvedEnrollment = await api()
      .put(`/api/enrollment/${enrollment.id}/approve`)
      .set(bearer(karim))
      .send();
    expectStatus(approvedEnrollment, 200, 'E5 Nour2');

    const requested = await api()
      .post('/api/lessons')
      .set(bearer(nourToken))
      .send({ type: 'Parc', requestedDate: nineAm });
    expectStatus(requested, 201, 'L2 demande');
    const lesson = requested.body as Lesson;

    // Karim est pris à 9 h : son approbation chevauche
    const refused = await api()
      .put(`/api/lessons/${lesson.id}/approve`)
      .set(bearer(karim))
      .send({ scheduledDate: nineFifteen, durationMinutes: SEED.lessonDurationMinutes });
    expectStatus(refused, 409, 'L5 chevauchement');
    expect((refused.body as ConflictBody).error).toBe('SCHEDULE_CONFLICT');

    // Sami est libre à 9 h 15 et Nour2 aussi
    const approved = await api()
      .put(`/api/lessons/${lesson.id}/approve`)
      .set(bearer(sami))
      .send({ scheduledDate: nineFifteen, durationMinutes: SEED.lessonDurationMinutes });
    expectStatus(approved, 200, 'L5 sans chevauchement');
    lessonIds.push((approved.body as Lesson).id);
  });

  step('L9 — l’agenda de la semaine : toute l’école, puis filtré par instructeur', async () => {
    const day = new Date(nineAm);
    const from = new Date(day.getTime() - 3 * 86_400_000).toISOString();
    const to = new Date(day.getTime() + 4 * 86_400_000).toISOString();

    const all = await api()
      .get('/api/lessons/agenda')
      .query({ from, to })
      .set(bearer(sami));
    expectStatus(all, 200, 'L9 toute l’école');
    const ids = (all.body as Lesson[]).map((lesson) => lesson.id);
    for (const id of lessonIds) expect(ids).toContain(id);
    // Triées par date
    const dates = (all.body as Lesson[]).map((lesson) => new Date(lesson.scheduledDate).getTime());
    expect([...dates].sort((a, b) => a - b)).toEqual(dates);

    const karimOnly = await api()
      .get('/api/lessons/agenda')
      .query({ from, to, instructorId: karimId })
      .set(bearer(sami));
    expectStatus(karimOnly, 200, 'L9 filtré');
    const karimLessons = karimOnly.body as Lesson[];
    expect(karimLessons.every((lesson) => lesson.instructorId === karimId)).toBe(true);
    expect(karimLessons.map((lesson) => lesson.id)).toEqual(
      expect.arrayContaining(lessonIds.slice(0, 2))
    );
    expect(karimLessons.map((lesson) => lesson.id)).not.toContain(lessonIds[2]);
    expect(samiId).toBeTruthy();
  });

  step('L9 — plage de plus de 31 jours : 400 VALIDATION_ERROR', async () => {
    const res = await api()
      .get('/api/lessons/agenda')
      .query({ from: futureDate(1), to: futureDate(40) })
      .set(bearer(karim));
    expectStatus(res, 400, 'L9 plage trop longue');
    expect((res.body as { error: string }).error).toBe('VALIDATION_ERROR');
  });

  step('L9 — un instructeur d’une autre école : 403 FORBIDDEN_SCHOOL', async () => {
    const outsider = await newInstructor(SEED.otherSchool.managerCode, 'Ailleurs');
    const res = await api()
      .get('/api/lessons/agenda')
      .query({ from: futureDate(1), to: futureDate(8), instructorId: karimId })
      .set(bearer(outsider));
    expectStatus(res, 403, 'L9 autre école');
    expect((res.body as { error: string }).error).toBe('FORBIDDEN_SCHOOL');
  });
});
