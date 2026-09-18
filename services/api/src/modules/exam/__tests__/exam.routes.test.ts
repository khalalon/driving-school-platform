import request from 'supertest';
import { createApp } from '../../../app';
import { HttpError } from '../../../http/errors';
import { bearerFor, testRequireAuth, UUID } from '../../../test-utils/http';
import { ExamController } from '../controllers/exam.controller';
import { createExamRouter } from '../routes/exam.routes';
import { ExamService } from '../services/exam.service';
import { RegistrationService } from '../services/registration.service';

describe('Routes /api/exams (état actuel)', () => {
  const examService = {
    createExam: jest.fn(),
    getExamById: jest.fn(),
    getExams: jest.fn(),
    updateExam: jest.fn(),
    deleteExam: jest.fn(),
    checkAvailability: jest.fn(),
  };
  const registrationService = {
    registerForExam: jest.fn(),
    getRegistrationById: jest.fn(),
    getRegistrationsByExam: jest.fn(),
    getRegistrationsByStudent: jest.fn(),
    recordResult: jest.fn(),
    cancelRegistration: jest.fn(),
    checkEligibility: jest.fn(),
  };
  const app = createApp({
    auth: createExamRouter(
      new ExamController(
        examService as unknown as ExamService,
        registrationService as unknown as RegistrationService
      ),
      testRequireAuth
    ),
  });
  const base = '/api/auth';
  const examId = UUID.booking;
  const future = new Date(Date.now() + 86_400_000).toISOString();

  beforeEach(() => jest.clearAllMocks());

  it('GET / : filtres validés ; type inconnu → 400', async () => {
    examService.getExams.mockResolvedValue([]);
    await request(app).get(`${base}?type=theory`).expect(200, []);
    expect(examService.getExams).toHaveBeenCalledWith({ type: 'theory' });
    await request(app).get(`${base}?type=oral`).expect(400);
  });

  it('POST / : admin seulement ; payload validé', async () => {
    const body = { schoolId: UUID.school, type: 'practical', dateTime: future, price: 60 };
    await request(app)
      .post(base)
      .set('Authorization', bearerFor('instructor'))
      .send(body)
      .expect(403);
    examService.createExam.mockResolvedValue({ id: examId, ...body });
    await request(app).post(base).set('Authorization', bearerFor('admin')).send(body).expect(201);
    await request(app)
      .post(base)
      .set('Authorization', bearerFor('admin'))
      .send({ ...body, price: -5 })
      .expect(400);
  });

  it('GET /:id, availability, PUT, DELETE', async () => {
    examService.getExamById.mockRejectedValue(
      new HttpError(404, 'NOT_FOUND', 'Examen introuvable')
    );
    await request(app).get(`${base}/${examId}`).expect(404);
    examService.checkAvailability.mockResolvedValue(false);
    await request(app).get(`${base}/${examId}/availability`).expect(200, { available: false });

    examService.updateExam.mockResolvedValue({ id: examId, price: 70 });
    await request(app)
      .put(`${base}/${examId}`)
      .set('Authorization', bearerFor('admin'))
      .send({ price: 70 })
      .expect(200);
    examService.deleteExam.mockResolvedValue(undefined);
    await request(app)
      .delete(`${base}/${examId}`)
      .set('Authorization', bearerFor('admin'))
      .expect(204);
  });

  it('inscriptions : register (élève), lectures, résultat (admin), annulation, éligibilité', async () => {
    registrationService.registerForExam.mockResolvedValue({ id: UUID.request, examId });
    await request(app)
      .post(`${base}/${examId}/register`)
      .set('Authorization', bearerFor('student'))
      .send({ studentId: UUID.student })
      .expect(201);
    expect(registrationService.registerForExam).toHaveBeenCalledWith(examId, UUID.student);

    registrationService.getRegistrationById.mockResolvedValue({ id: UUID.request });
    registrationService.getRegistrationsByExam.mockResolvedValue([]);
    registrationService.getRegistrationsByStudent.mockResolvedValue([]);
    await request(app).get(`${base}/registrations/${UUID.request}`).expect(200);
    await request(app).get(`${base}/${examId}/registrations`).expect(200, []);
    await request(app)
      .get(`${base}/students/${UUID.student}/registrations`)
      .set('Authorization', bearerFor('student'))
      .expect(200, []);

    registrationService.recordResult.mockResolvedValue({ id: UUID.request, result: 'passed' });
    await request(app)
      .put(`${base}/registrations/${UUID.request}/result`)
      .set('Authorization', bearerFor('instructor'))
      .send({ result: 'passed' })
      .expect(403);
    await request(app)
      .put(`${base}/registrations/${UUID.request}/result`)
      .set('Authorization', bearerFor('admin'))
      .send({ result: 'passed', score: 18 })
      .expect(200);
    await request(app)
      .put(`${base}/registrations/${UUID.request}/result`)
      .set('Authorization', bearerFor('admin'))
      .send({ result: 'PASS' })
      .expect(400);

    registrationService.cancelRegistration.mockResolvedValue(undefined);
    await request(app)
      .delete(`${base}/registrations/${UUID.request}`)
      .set('Authorization', bearerFor('student'))
      .expect(204);

    registrationService.checkEligibility.mockResolvedValue({ eligible: true });
    await request(app)
      .get(`${base}/students/${UUID.student}/eligibility?type=theory`)
      .set('Authorization', bearerFor('student'))
      .expect(200, { eligible: true });
    await request(app)
      .get(`${base}/students/${UUID.student}/eligibility`)
      .set('Authorization', bearerFor('student'))
      .expect(400);
  });
});
