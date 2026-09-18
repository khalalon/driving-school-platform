import request from 'supertest';
import { createApp } from '../../../app';
import { HttpError } from '../../../http/errors';
import { bearerFor, testRequireAuth, UUID } from '../../../test-utils/http';
import { ExamController } from '../controllers/exam.controller';
import { createExamRouter } from '../routes/exam.routes';
import { ExamService } from '../services/exam.service';

describe('Routes /api/exams (anciennes sessions sur le schéma 008, jusqu’en 5.5)', () => {
  const examService = {
    createExam: jest.fn(),
    getExamById: jest.fn(),
    getExams: jest.fn(),
    updateExam: jest.fn(),
    deleteExam: jest.fn(),
  };
  const app = createApp({
    auth: createExamRouter(
      new ExamController(examService as unknown as ExamService),
      testRequireAuth
    ),
  });
  const base = '/api/auth';
  const examId = UUID.booking;
  const future = new Date(Date.now() + 86_400_000).toISOString();

  beforeEach(() => jest.clearAllMocks());

  it('GET / : filtres validés (status multiple) ; type ou statut inconnu → 400', async () => {
    examService.getExams.mockResolvedValue([]);
    await request(app).get(`${base}?type=theory&status=pending,scheduled`).expect(200, []);
    expect(examService.getExams).toHaveBeenCalledWith({
      type: 'theory',
      status: ['pending', 'scheduled'],
    });
    await request(app).get(`${base}?type=oral`).expect(400);
    await request(app).get(`${base}?status=booked`).expect(400);
  });

  it('POST / : admin seulement ; studentId exigé depuis 008 ; payload validé', async () => {
    const body = {
      schoolId: UUID.school,
      studentId: UUID.student,
      type: 'practical',
      dateTime: future,
      location: 'Centre ATTT Ariana',
      price: 60,
    };
    await request(app)
      .post(base)
      .set('Authorization', bearerFor('instructor'))
      .send(body)
      .expect(403);
    examService.createExam.mockResolvedValue({ id: examId, ...body });
    await request(app).post(base).set('Authorization', bearerFor('admin')).send(body).expect(201);

    const { studentId: _omitted, ...withoutStudent } = body;
    void _omitted;
    const missing = await request(app)
      .post(base)
      .set('Authorization', bearerFor('admin'))
      .send(withoutStudent);
    expect(missing.status).toBe(400);
    expect((missing.body as { message: string }).message).toContain('studentId');
  });

  it('GET /:id : 404 relayé ; identifiant mal formé → 404 sans appel au service', async () => {
    examService.getExamById.mockRejectedValue(
      new HttpError(404, 'NOT_FOUND', 'Examen introuvable')
    );
    const res = await request(app).get(`${base}/${examId}`);
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'NOT_FOUND', message: 'Examen introuvable' });

    await request(app).get(`${base}/not-a-uuid`).expect(404);
    expect(examService.getExamById).toHaveBeenCalledTimes(1);
  });

  it('PUT /:id : admin ; corps vide → 400 ; statut hors vocabulaire → 400', async () => {
    examService.updateExam.mockResolvedValue({ id: examId, location: 'Salle 2' });
    await request(app)
      .put(`${base}/${examId}`)
      .set('Authorization', bearerFor('admin'))
      .send({ location: 'Salle 2' })
      .expect(200, { id: examId, location: 'Salle 2' });
    await request(app)
      .put(`${base}/${examId}`)
      .set('Authorization', bearerFor('admin'))
      .send({})
      .expect(400);
    await request(app)
      .put(`${base}/${examId}`)
      .set('Authorization', bearerFor('admin'))
      .send({ status: 'booked' })
      .expect(400);
  });

  it('DELETE /:id : 204 admin ; 401 sans jeton', async () => {
    examService.deleteExam.mockResolvedValue(undefined);
    await request(app)
      .delete(`${base}/${examId}`)
      .set('Authorization', bearerFor('admin'))
      .expect(204);
    await request(app).delete(`${base}/${examId}`).expect(401);
  });

  it('routes d’inscription et d’éligibilité disparues avec exam_registrations (3.4, D-26)', async () => {
    await request(app)
      .post(`${base}/${examId}/register`)
      .set('Authorization', bearerFor('student'))
      .send({ studentId: UUID.student })
      .expect(404);
    await request(app)
      .get(`${base}/students/${UUID.student}/eligibility`)
      .set('Authorization', bearerFor('student'))
      .expect(404);
    await request(app).get(`${base}/${examId}/availability`).expect(404);
  });
});
