import request from 'supertest';
import { createApp } from '../../../app';
import { HttpError } from '../../../http/errors';
import { bearerFor, TEST_USERS, testRequireAuth, UUID } from '../../../test-utils/http';
import { LessonController } from '../controllers/lesson.controller';
import { createLessonRouter } from '../routes/lesson.routes';
import { LessonService } from '../services/lesson.service';

describe('Routes /api/lessons (L1, L2, GET /:id)', () => {
  const lessonService = {
    requestLesson: jest.fn(),
    listLessons: jest.fn(),
    getLesson: jest.fn(),
    approveLesson: jest.fn(),
    rejectLesson: jest.fn(),
    cancelLesson: jest.fn(),
    bookForStudent: jest.fn(),
    markAttendance: jest.fn(),
  };
  const app = createApp({
    auth: createLessonRouter(
      new LessonController(lessonService as unknown as LessonService),
      testRequireAuth
    ),
  });
  const base = '/api/auth';
  const lessonId = UUID.booking;
  const future = new Date(Date.now() + 3 * 86_400_000).toISOString();

  beforeEach(() => jest.clearAllMocks());

  it('L2 POST / : élève seulement (401 sans jeton, 403 instructeur) ; 201 avec le payload validé', async () => {
    const body = { type: 'Parc', requestedDate: future, notes: 'Première leçon' };
    await request(app).post(base).send(body).expect(401);
    await request(app)
      .post(base)
      .set('Authorization', bearerFor('instructor'))
      .send(body)
      .expect(403);

    lessonService.requestLesson.mockResolvedValue({ id: lessonId, status: 'pending' });
    const res = await request(app).post(base).set('Authorization', bearerFor('student')).send(body);
    expect(res.status).toBe(201);
    expect(res.body).toEqual({ id: lessonId, status: 'pending' });
    expect(lessonService.requestLesson).toHaveBeenCalledWith(
      expect.objectContaining({ userId: TEST_USERS.student.userId }),
      { type: 'Parc', requestedDate: new Date(future), notes: 'Première leçon' }
    );
  });

  it('L2 : 400 VALIDATION_ERROR (type hors D-18, date passée) ; 403 NOT_ENROLLED relayé', async () => {
    const auth = bearerFor('student');
    await request(app)
      .post(base)
      .set('Authorization', auth)
      .send({ type: 'PRACTICAL', requestedDate: future })
      .expect(400);
    await request(app)
      .post(base)
      .set('Authorization', auth)
      .send({ type: 'Parc', requestedDate: '2020-01-01T10:00:00.000Z' })
      .expect(400);
    expect(lessonService.requestLesson).not.toHaveBeenCalled();

    lessonService.requestLesson.mockRejectedValue(
      new HttpError(403, 'NOT_ENROLLED', 'Vous devez être inscrit')
    );
    const res = await request(app)
      .post(base)
      .set('Authorization', auth)
      .send({ type: 'Parc', requestedDate: future });
    expect(res.status).toBe(403);
    expect(res.body).toEqual({ error: 'NOT_ENROLLED', message: 'Vous devez être inscrit' });
  });

  it('L1 GET / : jeton requis ; filtres validés (status multiple, scope, date) ; statut inconnu → 400', async () => {
    await request(app).get(base).expect(401);

    lessonService.listLessons.mockResolvedValue([]);
    await request(app)
      .get(`${base}?status=pending,scheduled&scope=mine&date=2026-10-01`)
      .set('Authorization', bearerFor('instructor'))
      .expect(200, []);
    expect(lessonService.listLessons).toHaveBeenCalledWith(
      expect.objectContaining({ userId: TEST_USERS.instructor.userId }),
      { status: ['pending', 'scheduled'], scope: 'mine', date: '2026-10-01' }
    );

    await request(app)
      .get(`${base}?status=booked`)
      .set('Authorization', bearerFor('student'))
      .expect(400);
    await request(app)
      .get(`${base}?scope=all`)
      .set('Authorization', bearerFor('student'))
      .expect(400);
  });

  it('GET /:id : 404 relayé ; identifiant mal formé → 404 sans appel au service', async () => {
    lessonService.getLesson.mockRejectedValue(new HttpError(404, 'NOT_FOUND', 'Leçon introuvable'));
    const res = await request(app)
      .get(`${base}/${lessonId}`)
      .set('Authorization', bearerFor('student'));
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'NOT_FOUND', message: 'Leçon introuvable' });

    await request(app)
      .get(`${base}/not-a-uuid`)
      .set('Authorization', bearerFor('student'))
      .expect(404);
    expect(lessonService.getLesson).toHaveBeenCalledTimes(1);
  });

  it('L5 PUT /:id/approve : instructeur seulement ; payload validé ; PRICE_REQUIRED relayé', async () => {
    const url = `${base}/${lessonId}/approve`;
    const body = { scheduledDate: future, durationMinutes: 60, adminNotes: 'RDV au parc' };
    await request(app).put(url).set('Authorization', bearerFor('student')).send(body).expect(403);
    await request(app).put(url).set('Authorization', bearerFor('admin')).send(body).expect(403);
    await request(app)
      .put(url)
      .set('Authorization', bearerFor('instructor'))
      .send({ scheduledDate: future })
      .expect(400);

    lessonService.approveLesson.mockResolvedValue({ id: lessonId, status: 'scheduled' });
    const ok = await request(app).put(url).set('Authorization', bearerFor('instructor')).send(body);
    expect(ok.status).toBe(200);
    expect(lessonService.approveLesson).toHaveBeenCalledWith(
      expect.objectContaining({ userId: TEST_USERS.instructor.userId }),
      lessonId,
      { scheduledDate: new Date(future), durationMinutes: 60, adminNotes: 'RDV au parc' }
    );

    lessonService.approveLesson.mockRejectedValue(
      new HttpError(400, 'PRICE_REQUIRED', 'Indiquez un prix')
    );
    const noPrice = await request(app)
      .put(url)
      .set('Authorization', bearerFor('instructor'))
      .send(body);
    expect(noPrice.status).toBe(400);
    expect(noPrice.body).toEqual({ error: 'PRICE_REQUIRED', message: 'Indiquez un prix' });
  });

  it('L6 PUT /:id/reject : instructeur ou admin ; motif 10–500 caractères (D-29)', async () => {
    const url = `${base}/${lessonId}/reject`;
    const reason = { reason: 'Créneau indisponible' };
    await request(app).put(url).set('Authorization', bearerFor('student')).send(reason).expect(403);
    await request(app)
      .put(url)
      .set('Authorization', bearerFor('instructor'))
      .send({ reason: 'court' })
      .expect(400);

    lessonService.rejectLesson.mockResolvedValue({ id: lessonId, status: 'rejected' });
    await request(app).put(url).set('Authorization', bearerFor('admin')).send(reason).expect(200);
    expect(lessonService.rejectLesson).toHaveBeenCalledWith(
      expect.objectContaining({ userId: TEST_USERS.admin.userId }),
      lessonId,
      reason
    );
  });

  it('L3 POST /:id/cancel : tout rôle authentifié, corps facultatif ; CANCEL_WINDOW_CLOSED relayé', async () => {
    const url = `${base}/${lessonId}/cancel`;
    await request(app).post(url).expect(401);

    lessonService.cancelLesson.mockResolvedValue({ id: lessonId, status: 'cancelled' });
    await request(app).post(url).set('Authorization', bearerFor('student')).expect(200);
    expect(lessonService.cancelLesson).toHaveBeenCalledWith(
      expect.objectContaining({ userId: TEST_USERS.student.userId }),
      lessonId,
      {}
    );
    await request(app)
      .post(url)
      .set('Authorization', bearerFor('instructor'))
      .send({ reason: 'Instructeur malade' })
      .expect(200);

    lessonService.cancelLesson.mockRejectedValue(
      new HttpError(403, 'CANCEL_WINDOW_CLOSED', 'Trop tard')
    );
    const closed = await request(app).post(url).set('Authorization', bearerFor('student'));
    expect(closed.status).toBe(403);
    expect(closed.body).toEqual({ error: 'CANCEL_WINDOW_CLOSED', message: 'Trop tard' });
  });

  it('L4 POST /book-for-student : instructeur seulement ; payload validé ; NOT_ENROLLED relayé', async () => {
    const url = `${base}/book-for-student`;
    const body = {
      studentId: UUID.student,
      type: 'CODE',
      scheduledDate: future,
      durationMinutes: 60,
    };
    await request(app).post(url).set('Authorization', bearerFor('student')).send(body).expect(403);
    await request(app)
      .post(url)
      .set('Authorization', bearerFor('instructor'))
      .send({ ...body, studentId: 'not-a-uuid' })
      .expect(400);

    lessonService.bookForStudent.mockResolvedValue({ id: lessonId, status: 'scheduled' });
    const ok = await request(app)
      .post(url)
      .set('Authorization', bearerFor('instructor'))
      .send(body);
    expect(ok.status).toBe(201);
    expect(lessonService.bookForStudent).toHaveBeenCalledWith(
      expect.objectContaining({ userId: TEST_USERS.instructor.userId }),
      {
        studentId: UUID.student,
        type: 'CODE',
        scheduledDate: new Date(future),
        durationMinutes: 60,
      }
    );

    lessonService.bookForStudent.mockRejectedValue(
      new HttpError(403, 'NOT_ENROLLED', 'Élève non inscrit')
    );
    const notEnrolled = await request(app)
      .post(url)
      .set('Authorization', bearerFor('instructor'))
      .send(body);
    expect(notEnrolled.status).toBe(403);
    expect(notEnrolled.body).toEqual({ error: 'NOT_ENROLLED', message: 'Élève non inscrit' });
  });

  it('L7 PUT /:id/attendance : instructeur seulement ; attended requis, rating 1–5', async () => {
    const url = `${base}/${lessonId}/attendance`;
    await request(app)
      .put(url)
      .set('Authorization', bearerFor('student'))
      .send({ attended: true })
      .expect(403);
    await request(app)
      .put(url)
      .set('Authorization', bearerFor('admin'))
      .send({ attended: true })
      .expect(403);
    await request(app).put(url).set('Authorization', bearerFor('instructor')).send({}).expect(400);
    await request(app)
      .put(url)
      .set('Authorization', bearerFor('instructor'))
      .send({ attended: true, rating: 9 })
      .expect(400);

    lessonService.markAttendance.mockResolvedValue({ id: lessonId, status: 'completed' });
    await request(app)
      .put(url)
      .set('Authorization', bearerFor('instructor'))
      .send({ attended: true, rating: 5, feedback: 'Bien' })
      .expect(200, { id: lessonId, status: 'completed' });
    expect(lessonService.markAttendance).toHaveBeenCalledWith(
      expect.objectContaining({ userId: TEST_USERS.instructor.userId }),
      lessonId,
      { attended: true, rating: 5, feedback: 'Bien' }
    );
  });

  it('anciennes routes de créneaux et de réservation disparues (5.2)', async () => {
    const auth = bearerFor('instructor');
    await request(app)
      .post(`${base}/${lessonId}/book`)
      .set('Authorization', auth)
      .send({})
      .expect(404);
    await request(app).get(`${base}/${lessonId}/bookings`).set('Authorization', auth).expect(404);
    await request(app)
      .get(`${base}/${lessonId}/availability`)
      .set('Authorization', auth)
      .expect(404);
    await request(app)
      .delete(`${base}/${lessonId}`)
      .set('Authorization', bearerFor('admin'))
      .expect(404);
  });
});
