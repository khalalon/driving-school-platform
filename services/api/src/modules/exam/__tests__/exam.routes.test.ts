import request from 'supertest';
import { createApp } from '../../../app';
import { HttpError } from '../../../http/errors';
import { bearerFor, TEST_USERS, testRequireAuth, UUID } from '../../../test-utils/http';
import { ExamController } from '../controllers/exam.controller';
import { createExamRouter } from '../routes/exam.routes';
import { ExamService } from '../services/exam.service';

describe('Routes /api/exams (X1, X2, GET /:id)', () => {
  const examService = {
    requestExam: jest.fn(),
    listExams: jest.fn(),
    getExam: jest.fn(),
    scheduleExam: jest.fn(),
    rejectExam: jest.fn(),
    recordResult: jest.fn(),
  };
  const app = createApp({
    auth: createExamRouter(
      new ExamController(examService as unknown as ExamService),
      testRequireAuth
    ),
  });
  const base = '/api/auth';
  const examId = UUID.booking;
  const future = new Date(Date.now() + 7 * 86_400_000).toISOString();

  beforeEach(() => jest.clearAllMocks());

  it('X2 POST /request : élève seulement ; 201 avec le payload validé ; NOT_ENROLLED relayé', async () => {
    const body = { examType: 'theory', preferredDate: future, message: 'Je suis prêt' };
    await request(app).post(`${base}/request`).send(body).expect(401);
    await request(app)
      .post(`${base}/request`)
      .set('Authorization', bearerFor('instructor'))
      .send(body)
      .expect(403);
    await request(app)
      .post(`${base}/request`)
      .set('Authorization', bearerFor('student'))
      .send({ examType: 'THEORY', preferredDate: future })
      .expect(400);

    examService.requestExam.mockResolvedValue({ id: examId, status: 'pending' });
    const res = await request(app)
      .post(`${base}/request`)
      .set('Authorization', bearerFor('student'))
      .send(body);
    expect(res.status).toBe(201);
    expect(examService.requestExam).toHaveBeenCalledWith(
      expect.objectContaining({ userId: TEST_USERS.student.userId }),
      { examType: 'theory', preferredDate: new Date(future), message: 'Je suis prêt' }
    );

    examService.requestExam.mockRejectedValue(new HttpError(403, 'NOT_ENROLLED', 'Non inscrit'));
    const notEnrolled = await request(app)
      .post(`${base}/request`)
      .set('Authorization', bearerFor('student'))
      .send(body);
    expect(notEnrolled.status).toBe(403);
    expect(notEnrolled.body).toEqual({ error: 'NOT_ENROLLED', message: 'Non inscrit' });
  });

  it('X1 GET /my-exams : jeton requis ; status multiple validé ; statut inconnu → 400', async () => {
    await request(app).get(`${base}/my-exams`).expect(401);

    examService.listExams.mockResolvedValue([]);
    await request(app)
      .get(`${base}/my-exams?status=pending,scheduled`)
      .set('Authorization', bearerFor('instructor'))
      .expect(200, []);
    expect(examService.listExams).toHaveBeenCalledWith(
      expect.objectContaining({ userId: TEST_USERS.instructor.userId }),
      { status: ['pending', 'scheduled'] }
    );
    await request(app)
      .get(`${base}/my-exams?status=passed`)
      .set('Authorization', bearerFor('student'))
      .expect(400);
  });

  it('GET /:id : 404 relayé ; identifiant mal formé → 404 sans appel au service', async () => {
    examService.getExam.mockRejectedValue(new HttpError(404, 'NOT_FOUND', 'Examen introuvable'));
    const res = await request(app)
      .get(`${base}/${examId}`)
      .set('Authorization', bearerFor('student'));
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'NOT_FOUND', message: 'Examen introuvable' });

    await request(app)
      .get(`${base}/not-a-uuid`)
      .set('Authorization', bearerFor('student'))
      .expect(404);
    expect(examService.getExam).toHaveBeenCalledTimes(1);
  });

  it('X3 PUT /:id/schedule : instructeur ou admin ; dateTime future + location requis', async () => {
    const url = `${base}/${examId}/schedule`;
    const body = { dateTime: future, location: 'Centre ATTT Ariana' };
    await request(app).put(url).set('Authorization', bearerFor('student')).send(body).expect(403);
    await request(app)
      .put(url)
      .set('Authorization', bearerFor('instructor'))
      .send({ dateTime: future })
      .expect(400);

    examService.scheduleExam.mockResolvedValue({ id: examId, status: 'scheduled' });
    await request(app)
      .put(url)
      .set('Authorization', bearerFor('instructor'))
      .send(body)
      .expect(200);
    expect(examService.scheduleExam).toHaveBeenCalledWith(
      expect.objectContaining({ userId: TEST_USERS.instructor.userId }),
      examId,
      { dateTime: new Date(future), location: 'Centre ATTT Ariana' }
    );
  });

  it('X4 PUT /:id/reject : motif 10–500 caractères ; X5 PUT /:id/result : passed|failed, score 0–100 facultatif', async () => {
    const auth = bearerFor('instructor');
    await request(app)
      .put(`${base}/${examId}/reject`)
      .set('Authorization', auth)
      .send({ reason: 'court' })
      .expect(400);
    examService.rejectExam.mockResolvedValue({ id: examId, status: 'rejected' });
    await request(app)
      .put(`${base}/${examId}/reject`)
      .set('Authorization', auth)
      .send({ reason: 'Dossier incomplet' })
      .expect(200);

    await request(app)
      .put(`${base}/${examId}/result`)
      .set('Authorization', auth)
      .send({ result: 'pending' })
      .expect(400);
    await request(app)
      .put(`${base}/${examId}/result`)
      .set('Authorization', auth)
      .send({ result: 'passed', score: 101 })
      .expect(400);
    examService.recordResult.mockResolvedValue({ id: examId, status: 'completed' });
    await request(app)
      .put(`${base}/${examId}/result`)
      .set('Authorization', auth)
      .send({ result: 'failed', notes: 'Créneau raté' })
      .expect(200);
    expect(examService.recordResult).toHaveBeenCalledWith(
      expect.objectContaining({ userId: TEST_USERS.instructor.userId }),
      examId,
      { result: 'failed', notes: 'Créneau raté' }
    );
    await request(app)
      .put(`${base}/${examId}/result`)
      .set('Authorization', bearerFor('student'))
      .send({ result: 'passed' })
      .expect(403);
  });

  it('anciennes routes de sessions disparues (5.5)', async () => {
    const auth = bearerFor('admin');
    await request(app).post(base).set('Authorization', auth).send({}).expect(404);
    await request(app).get(base).set('Authorization', auth).expect(404);
    await request(app).put(`${base}/${examId}`).set('Authorization', auth).send({}).expect(404);
    await request(app).delete(`${base}/${examId}`).set('Authorization', auth).expect(404);
  });
});
