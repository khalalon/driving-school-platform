import request from 'supertest';
import { createApp } from '../../../app';
import { HttpError } from '../../../http/errors';
import { bearerFor, TEST_USERS, testRequireAuth, UUID } from '../../../test-utils/http';
import { EnrollmentController } from '../controllers/enrollment.controller';
import { createEnrollmentRouter } from '../routes/enrollment.routes';
import { EnrollmentService } from '../services/enrollment.service';

describe('Routes /api/enrollment (E1–E6)', () => {
  const service = {
    createEnrollmentRequest: jest.fn(),
    getStudentRequests: jest.fn(),
    getSchoolRequests: jest.fn(),
    approveRequest: jest.fn(),
    rejectRequest: jest.fn(),
    getEnrollmentStatus: jest.fn(),
  };
  const app = createApp({
    auth: createEnrollmentRouter(
      new EnrollmentController(service as unknown as EnrollmentService),
      testRequireAuth
    ),
  });
  // Le routeur est monté sur /api/auth par commodité de test : seuls les chemins relatifs comptent.
  const base = '/api/auth';
  const requestBody = {
    id: UUID.request,
    studentId: TEST_USERS.student.userId,
    schoolId: UUID.school,
    status: 'pending',
  };

  beforeEach(() => jest.clearAllMocks());

  it('E2 : la demande est rattachée au users.id du jeton (plus de student_id NULL)', async () => {
    service.createEnrollmentRequest.mockResolvedValue(requestBody);

    const res = await request(app)
      .post(`${base}/schools/${UUID.school}/request`)
      .set('Authorization', bearerFor('student'))
      .send({ message: 'Bonjour' });

    expect(res.status).toBe(201);
    expect(service.createEnrollmentRequest).toHaveBeenCalledWith(
      TEST_USERS.student.userId,
      UUID.school,
      'Bonjour'
    );
    expect(res.body).toMatchObject({ studentId: TEST_USERS.student.userId });
  });

  it('E2 : 401 sans jeton, 403 pour un instructeur', async () => {
    await request(app).post(`${base}/schools/${UUID.school}/request`).send({}).expect(401);
    const res = await request(app)
      .post(`${base}/schools/${UUID.school}/request`)
      .set('Authorization', bearerFor('instructor'))
      .send({});
    expect(res.status).toBe(403);
    expect(res.body).toMatchObject({ error: 'FORBIDDEN' });
  });

  it('E2 : 400 VALIDATION_ERROR pour un message trop long', async () => {
    const res = await request(app)
      .post(`${base}/schools/${UUID.school}/request`)
      .set('Authorization', bearerFor('student'))
      .send({ message: 'x'.repeat(501) });
    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({ error: 'VALIDATION_ERROR' });
  });

  it('E2 : 409 CONFLICT relayé depuis le service', async () => {
    service.createEnrollmentRequest.mockRejectedValue(
      new HttpError(409, 'CONFLICT', 'Une demande est déjà en attente pour cette école')
    );
    const res = await request(app)
      .post(`${base}/schools/${UUID.school}/request`)
      .set('Authorization', bearerFor('student'))
      .send({});
    expect(res.status).toBe(409);
    expect(res.body).toEqual({
      error: 'CONFLICT',
      message: 'Une demande est déjà en attente pour cette école',
    });
  });

  it('E3 : mes demandes, pour l’élève du jeton', async () => {
    service.getStudentRequests.mockResolvedValue([requestBody]);
    const res = await request(app)
      .get(`${base}/my-requests`)
      .set('Authorization', bearerFor('student'));
    expect(res.status).toBe(200);
    expect(service.getStudentRequests).toHaveBeenCalledWith(TEST_USERS.student.userId);
  });

  it('E4 : filtre status transmis ; valeur inconnue → 400', async () => {
    service.getSchoolRequests.mockResolvedValue([]);
    await request(app)
      .get(`${base}/schools/${UUID.school}/requests?status=pending`)
      .set('Authorization', bearerFor('instructor'))
      .expect(200);
    expect(service.getSchoolRequests).toHaveBeenCalledWith(
      expect.objectContaining({ userId: TEST_USERS.instructor.userId }),
      UUID.school,
      'pending'
    );

    const bad = await request(app)
      .get(`${base}/schools/${UUID.school}/requests?status=nope`)
      .set('Authorization', bearerFor('instructor'));
    expect(bad.status).toBe(400);
    expect(bad.body).toMatchObject({ error: 'VALIDATION_ERROR' });
  });

  it('E4 : 403 pour un élève', async () => {
    await request(app)
      .get(`${base}/schools/${UUID.school}/requests`)
      .set('Authorization', bearerFor('student'))
      .expect(403);
  });

  it('E5 : approbation par l’instructeur du jeton ; identifiant mal formé → 404', async () => {
    service.approveRequest.mockResolvedValue({ ...requestBody, status: 'approved' });
    const res = await request(app)
      .put(`${base}/${UUID.request}/approve`)
      .set('Authorization', bearerFor('instructor'));
    expect(res.status).toBe(200);
    expect(service.approveRequest).toHaveBeenCalledWith(
      expect.objectContaining({ userId: TEST_USERS.instructor.userId }),
      UUID.request
    );

    const bad = await request(app)
      .put(`${base}/not-a-uuid/approve`)
      .set('Authorization', bearerFor('admin'));
    expect(bad.status).toBe(404);
    expect(bad.body).toEqual({ error: 'NOT_FOUND', message: "Demande d'inscription introuvable" });
  });

  it('E6 : motif < 10 caractères → 400 (D-29) ; motif valide → 200', async () => {
    const bad = await request(app)
      .put(`${base}/${UUID.request}/reject`)
      .set('Authorization', bearerFor('instructor'))
      .send({ reason: 'court' });
    expect(bad.status).toBe(400);

    service.rejectRequest.mockResolvedValue({ ...requestBody, status: 'rejected' });
    const ok = await request(app)
      .put(`${base}/${UUID.request}/reject`)
      .set('Authorization', bearerFor('instructor'))
      .send({ reason: 'Dossier incomplet, merci de compléter' });
    expect(ok.status).toBe(200);
    expect(service.rejectRequest).toHaveBeenCalledWith(
      expect.objectContaining({ userId: TEST_USERS.instructor.userId }),
      UUID.request,
      'Dossier incomplet, merci de compléter'
    );
  });

  it('E1 : statut pour l’élève du jeton', async () => {
    service.getEnrollmentStatus.mockResolvedValue({ isEnrolled: true, canBook: true });
    const res = await request(app)
      .get(`${base}/schools/${UUID.school}/status`)
      .set('Authorization', bearerFor('student'));
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ isEnrolled: true, canBook: true });
    expect(service.getEnrollmentStatus).toHaveBeenCalledWith(
      TEST_USERS.student.userId,
      UUID.school
    );
  });
});
