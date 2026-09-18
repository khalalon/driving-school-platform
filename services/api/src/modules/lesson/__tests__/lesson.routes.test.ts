import request from 'supertest';
import { createApp } from '../../../app';
import { HttpError } from '../../../http/errors';
import { bearerFor, testRequireAuth, UUID } from '../../../test-utils/http';
import { LessonController } from '../controllers/lesson.controller';
import { createLessonRouter } from '../routes/lesson.routes';
import { BookingService } from '../services/booking.service';
import { LessonService } from '../services/lesson.service';

describe('Routes /api/lessons (état actuel)', () => {
  const lessonService = {
    createLesson: jest.fn(),
    getLessonById: jest.fn(),
    getLessons: jest.fn(),
    updateLesson: jest.fn(),
    cancelLesson: jest.fn(),
    deleteLesson: jest.fn(),
    checkAvailability: jest.fn(),
  };
  const bookingService = {
    bookLesson: jest.fn(),
    getBookingById: jest.fn(),
    getBookingsByLesson: jest.fn(),
    getBookingsByStudent: jest.fn(),
    markAttendance: jest.fn(),
    cancelBooking: jest.fn(),
  };
  const app = createApp({
    auth: createLessonRouter(
      new LessonController(
        lessonService as unknown as LessonService,
        bookingService as unknown as BookingService
      ),
      testRequireAuth
    ),
  });
  const base = '/api/auth';
  const lessonId = UUID.booking;
  const future = new Date(Date.now() + 86_400_000).toISOString();

  beforeEach(() => jest.clearAllMocks());

  it('GET / : filtres validés (type hors D-18 → 400), dates converties', async () => {
    lessonService.getLessons.mockResolvedValue([]);
    await request(app).get(`${base}?schoolId=${UUID.school}&type=Parc`).expect(200, []);
    expect(lessonService.getLessons).toHaveBeenCalledWith({ schoolId: UUID.school, type: 'Parc' });

    const bad = await request(app).get(`${base}?type=DRIVING`);
    expect(bad.status).toBe(400);
    expect(bad.body).toMatchObject({ error: 'VALIDATION_ERROR' });
  });

  it('POST / : 403 élève ; 201 instructeur avec payload valide ; date passée → 400 Joi', async () => {
    const body = {
      schoolId: UUID.school,
      studentId: UUID.student,
      instructorId: UUID.instructor,
      type: 'Parc',
      scheduledDate: future,
      durationMinutes: 60,
      price: 40,
    };
    await request(app).post(base).set('Authorization', bearerFor('student')).send(body).expect(403);

    lessonService.createLesson.mockResolvedValue({ id: lessonId, ...body });
    const ok = await request(app)
      .post(base)
      .set('Authorization', bearerFor('instructor'))
      .send(body);
    expect(ok.status).toBe(201);

    const past = await request(app)
      .post(base)
      .set('Authorization', bearerFor('instructor'))
      .send({ ...body, scheduledDate: '2020-01-01T10:00:00.000Z' });
    expect(past.status).toBe(400);
  });

  it('GET /:id, /:id/availability : 404 relayé, identifiant mal formé → 404', async () => {
    lessonService.getLessonById.mockRejectedValue(
      new HttpError(404, 'NOT_FOUND', 'Leçon introuvable')
    );
    await request(app).get(`${base}/${lessonId}`).expect(404);
    await request(app).get(`${base}/nope`).expect(404);

    lessonService.checkAvailability.mockResolvedValue(true);
    await request(app).get(`${base}/${lessonId}/availability`).expect(200, { available: true });
  });

  it('PUT /:id, POST /:id/cancel, DELETE /:id (admin)', async () => {
    lessonService.updateLesson.mockResolvedValue({ id: lessonId, price: 50 });
    lessonService.cancelLesson.mockResolvedValue({ id: lessonId, status: 'cancelled' });
    lessonService.deleteLesson.mockResolvedValue(undefined);

    await request(app)
      .put(`${base}/${lessonId}`)
      .set('Authorization', bearerFor('instructor'))
      .send({ price: 50 })
      .expect(200);
    await request(app)
      .post(`${base}/${lessonId}/cancel`)
      .set('Authorization', bearerFor('instructor'))
      .expect(200);
    await request(app)
      .delete(`${base}/${lessonId}`)
      .set('Authorization', bearerFor('instructor'))
      .expect(403);
    await request(app)
      .delete(`${base}/${lessonId}`)
      .set('Authorization', bearerFor('admin'))
      .expect(204);
  });

  it('réservations : book (élève), lecture, présence (instructeur), annulation', async () => {
    bookingService.bookLesson.mockResolvedValue({ id: UUID.request, lessonId });
    const booked = await request(app)
      .post(`${base}/${lessonId}/book`)
      .set('Authorization', bearerFor('student'))
      .send({ studentId: UUID.student });
    expect(booked.status).toBe(201);
    expect(bookingService.bookLesson).toHaveBeenCalledWith(lessonId, UUID.student);

    await request(app)
      .post(`${base}/${lessonId}/book`)
      .set('Authorization', bearerFor('student'))
      .send({ studentId: 'not-a-uuid' })
      .expect(400);

    bookingService.getBookingById.mockResolvedValue({ id: UUID.request });
    bookingService.getBookingsByLesson.mockResolvedValue([]);
    bookingService.getBookingsByStudent.mockResolvedValue([]);
    await request(app).get(`${base}/bookings/${UUID.request}`).expect(200);
    await request(app).get(`${base}/${lessonId}/bookings`).expect(200, []);
    await request(app).get(`${base}/students/${UUID.student}/bookings`).expect(401);
    await request(app)
      .get(`${base}/students/${UUID.student}/bookings`)
      .set('Authorization', bearerFor('student'))
      .expect(200, []);

    bookingService.markAttendance.mockResolvedValue({ id: UUID.request, attended: true });
    await request(app)
      .put(`${base}/bookings/${UUID.request}/attendance`)
      .set('Authorization', bearerFor('instructor'))
      .send({ attended: true, rating: 5 })
      .expect(200);
    await request(app)
      .put(`${base}/bookings/${UUID.request}/attendance`)
      .set('Authorization', bearerFor('instructor'))
      .send({ attended: true, rating: 9 })
      .expect(400);

    bookingService.cancelBooking.mockResolvedValue(undefined);
    await request(app)
      .delete(`${base}/bookings/${UUID.request}`)
      .set('Authorization', bearerFor('student'))
      .expect(204);
  });
});
