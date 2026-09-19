import request from 'supertest';
import { createApp } from '../../../app';
import { HttpError } from '../../../http/errors';
import { bearerFor, TEST_USERS, testRequireAuth, UUID } from '../../../test-utils/http';
import { ProfileController } from '../controllers/profile.controller';
import { VerificationController } from '../controllers/verification.controller';
import { createProfileRouter, createStudentProfileRouter } from '../routes/profile.routes';
import { createVerificationRouter } from '../routes/verification.routes';
import { ProfileService } from '../services/profile.service';
import { VerificationService } from '../services/verification.service';

describe('Routes /api/profiles, /api/student-profiles, /api/verification', () => {
  const profileService = {
    getCompleteProfile: jest.fn(),
    getOwnProfile: jest.fn(),
    getStudentLessons: jest.fn(),
    getStudentExams: jest.fn(),
    getFinancialSummary: jest.fn(),
    updateInstructorNotes: jest.fn(),
    markLessonPaid: jest.fn(),
    markExamPaid: jest.fn(),
  };
  const verificationService = {
    verifyEnrollment: jest.fn(),
    recordLessonCompletion: jest.fn(),
  };
  const profileController = new ProfileController(profileService as unknown as ProfileService);
  const app = createApp({
    auth: createProfileRouter(profileController, testRequireAuth),
    profiles: createStudentProfileRouter(profileController, testRequireAuth),
    verification: createVerificationRouter(
      new VerificationController(verificationService as unknown as VerificationService)
    ),
  });
  const staff = '/api/auth';
  const self = '/api/profiles';

  beforeEach(() => jest.clearAllMocks());

  it('P1 : fiche complète pour un instructeur ; 403 pour un élève', async () => {
    profileService.getCompleteProfile.mockResolvedValue({ id: UUID.student, notes: 'privé' });
    const res = await request(app)
      .get(`${staff}/${UUID.student}/schools/${UUID.school}/complete`)
      .set('Authorization', bearerFor('instructor'));
    expect(res.status).toBe(200);
    expect(profileService.getCompleteProfile).toHaveBeenCalledWith(UUID.student, UUID.school);

    await request(app)
      .get(`${staff}/${UUID.student}/schools/${UUID.school}/complete`)
      .set('Authorization', bearerFor('student'))
      .expect(403);
  });

  it('P1 : 404 relayé depuis le service', async () => {
    profileService.getCompleteProfile.mockRejectedValue(
      new HttpError(404, 'NOT_FOUND', 'Fiche élève introuvable pour cette école')
    );
    const res = await request(app)
      .get(`${staff}/${UUID.student}/schools/${UUID.school}/complete`)
      .set('Authorization', bearerFor('admin'));
    expect(res.status).toBe(404);
    expect(res.body).toMatchObject({ error: 'NOT_FOUND' });
  });

  it('P2–P4 : historiques et synthèse financière', async () => {
    profileService.getStudentLessons.mockResolvedValue([]);
    profileService.getStudentExams.mockResolvedValue([]);
    profileService.getFinancialSummary.mockResolvedValue({ totalDue: 0 });
    const auth = bearerFor('instructor');
    const prefix = `${staff}/${UUID.student}/schools/${UUID.school}`;

    await request(app).get(`${prefix}/lessons`).set('Authorization', auth).expect(200, []);
    await request(app).get(`${prefix}/exams`).set('Authorization', auth).expect(200, []);
    await request(app)
      .get(`${prefix}/financial`)
      .set('Authorization', auth)
      .expect(200, { totalDue: 0 });
  });

  it('P5 : notes → 204 ; notes vides → 400', async () => {
    profileService.updateInstructorNotes.mockResolvedValue(undefined);
    await request(app)
      .put(`${staff}/${UUID.student}/notes`)
      .set('Authorization', bearerFor('instructor'))
      .send({ notes: 'Progresse bien' })
      .expect(204);
    expect(profileService.updateInstructorNotes).toHaveBeenCalledWith(
      UUID.student,
      'Progresse bien'
    );

    const bad = await request(app)
      .put(`${staff}/${UUID.student}/notes`)
      .set('Authorization', bearerFor('instructor'))
      .send({ notes: '   ' });
    expect(bad.status).toBe(400);
  });

  it('P6/P7 : marquer payé → 204 ; montant négatif → 400', async () => {
    profileService.markLessonPaid.mockResolvedValue(undefined);
    profileService.markExamPaid.mockResolvedValue(undefined);
    const auth = bearerFor('instructor');

    await request(app)
      .put(`${staff}/lessons/${UUID.booking}/mark-paid`)
      .set('Authorization', auth)
      .send({ amount: 40, paymentMethod: 'cash' })
      .expect(204);
    expect(profileService.markLessonPaid).toHaveBeenCalledWith(UUID.booking, 40, 'cash');

    await request(app)
      .put(`${staff}/exams/${UUID.booking}/mark-paid`)
      .set('Authorization', auth)
      .send({ amount: 60, paymentMethod: 'card' })
      .expect(204);
    expect(profileService.markExamPaid).toHaveBeenCalledWith(UUID.booking, 60, 'card');

    // Anciens chemins (lesson_bookings / exam_registrations) : disparus en 5.0.
    await request(app)
      .put(`${staff}/bookings/${UUID.booking}/mark-paid`)
      .set('Authorization', auth)
      .send({ amount: 40, paymentMethod: 'cash' })
      .expect(404);

    const bad = await request(app)
      .put(`${staff}/lessons/${UUID.booking}/mark-paid`)
      .set('Authorization', auth)
      .send({ amount: -1, paymentMethod: 'cash' });
    expect(bad.status).toBe(400);
  });

  it('P8–P11 : la vue élève utilise le users.id du jeton, sans les notes', async () => {
    profileService.getOwnProfile.mockResolvedValue({ id: UUID.student });
    profileService.getStudentLessons.mockResolvedValue([]);
    profileService.getStudentExams.mockResolvedValue([]);
    profileService.getFinancialSummary.mockResolvedValue({ totalDue: 0 });
    const auth = bearerFor('student');
    const prefix = `${self}/me/schools/${UUID.school}`;

    const res = await request(app).get(`${prefix}/profile`).set('Authorization', auth);
    expect(res.status).toBe(200);
    expect(profileService.getOwnProfile).toHaveBeenCalledWith(
      TEST_USERS.student.userId,
      UUID.school
    );
    await request(app).get(`${prefix}/lessons`).set('Authorization', auth).expect(200);
    await request(app).get(`${prefix}/exams`).set('Authorization', auth).expect(200);
    await request(app).get(`${prefix}/financial`).set('Authorization', auth).expect(200);

    await request(app)
      .get(`${prefix}/profile`)
      .set('Authorization', bearerFor('instructor'))
      .expect(403);
  });

  it('verification : paramètres requis, examType contrôlé, payload validé', async () => {
    const bad = await request(app).get('/api/verification/verify-enrollment');
    expect(bad.status).toBe(400);
    expect(bad.body).toMatchObject({ error: 'VALIDATION_ERROR' });

    verificationService.verifyEnrollment.mockResolvedValue({ isEnrolled: false, canBook: false });
    await request(app)
      .get(`/api/verification/verify-enrollment?userId=u&schoolId=${UUID.school}`)
      .expect(200, { isEnrolled: false, canBook: false });

    // Éligibilité retirée (D-26, 3.4) : la route n'existe plus.
    await request(app)
      .get(`/api/verification/students/${UUID.student}/eligibility?schoolId=${UUID.school}`)
      .expect(404);

    const badBody = await request(app)
      .post(`/api/verification/students/${UUID.student}/lesson-completed`)
      .send({ schoolId: UUID.school, lessonType: 'DRIVING', attended: true });
    expect(badBody.status).toBe(400);

    verificationService.recordLessonCompletion.mockResolvedValue({ completedLessons: 1 });
    await request(app)
      .post(`/api/verification/students/${UUID.student}/lesson-completed`)
      .send({ schoolId: UUID.school, lessonType: 'Parc', attended: true })
      .expect(200, { completedLessons: 1 });
  });
});
