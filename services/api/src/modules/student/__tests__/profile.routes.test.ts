import request from 'supertest';
import { createApp } from '../../../app';
import { HttpError } from '../../../http/errors';
import { bearerFor, TEST_USERS, testRequireAuth, UUID } from '../../../test-utils/http';
import { ProfileController } from '../controllers/profile.controller';
import { StudentFileController } from '../controllers/student-file.controller';
import { createProfileRouter, createStudentProfileRouter } from '../routes/profile.routes';
import { ProfileService } from '../services/profile.service';
import { StudentFileService } from '../services/student-file.service';

describe('Routes /api/profiles, /api/student-profiles', () => {
  const profileService = {
    getCompleteProfile: jest.fn(),
    getOwnProfile: jest.fn(),
    getStudentLessons: jest.fn(),
    getStudentExams: jest.fn(),
    getFinancialSummary: jest.fn(),
    getOwnLessons: jest.fn(),
    getOwnExams: jest.fn(),
    getOwnFinancialSummary: jest.fn(),
    updateInstructorNotes: jest.fn(),
    markLessonPaid: jest.fn(),
    markExamPaid: jest.fn(),
  };
  const studentFileService = {
    getStudentFile: jest.fn(),
    getOwnFile: jest.fn(),
    setDocumentReceived: jest.fn(),
  };
  const profileController = new ProfileController(profileService as unknown as ProfileService);
  const fileController = new StudentFileController(
    studentFileService as unknown as StudentFileService
  );
  const app = createApp({
    auth: createProfileRouter(profileController, fileController, testRequireAuth),
    profiles: createStudentProfileRouter(profileController, fileController, testRequireAuth),
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
    expect(profileService.getCompleteProfile).toHaveBeenCalledWith(
      expect.objectContaining({ userId: TEST_USERS.instructor.userId, role: 'instructor' }),
      UUID.student,
      UUID.school
    );

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
      expect.objectContaining({ userId: TEST_USERS.instructor.userId }),
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
    expect(profileService.markLessonPaid).toHaveBeenCalledWith(
      expect.objectContaining({ userId: TEST_USERS.instructor.userId }),
      UUID.booking,
      40,
      'cash'
    );

    await request(app)
      .put(`${staff}/exams/${UUID.booking}/mark-paid`)
      .set('Authorization', auth)
      .send({ amount: 60, paymentMethod: 'card' })
      .expect(204);
    expect(profileService.markExamPaid).toHaveBeenCalledWith(
      expect.objectContaining({ userId: TEST_USERS.instructor.userId }),
      UUID.booking,
      60,
      'card'
    );

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
    profileService.getOwnLessons.mockResolvedValue([]);
    profileService.getOwnExams.mockResolvedValue([]);
    profileService.getOwnFinancialSummary.mockResolvedValue({ totalDue: 0 });
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
    expect(profileService.getOwnLessons).toHaveBeenCalledWith(
      TEST_USERS.student.userId,
      UUID.school
    );
    expect(profileService.getOwnExams).toHaveBeenCalledWith(TEST_USERS.student.userId, UUID.school);
    expect(profileService.getOwnFinancialSummary).toHaveBeenCalledWith(
      TEST_USERS.student.userId,
      UUID.school
    );

    await request(app)
      .get(`${prefix}/profile`)
      .set('Authorization', bearerFor('instructor'))
      .expect(403);
  });

  it('/api/verification/* : supprimé (5.7), 404 partout', async () => {
    await request(app).get('/api/verification/verify-enrollment').expect(404);
    await request(app)
      .post(`/api/verification/students/${UUID.student}/lesson-completed`)
      .send({ schoolId: UUID.school, lessonType: 'Parc', attended: true })
      .expect(404);
  });

  it('F5 / F7 : dossier lu puis pièce cochée par l’instructeur ; un élève n’y touche pas', async () => {
    const file = {
      complete: false,
      documents: [{ documentTypeId: UUID.booking, received: false }],
    };
    studentFileService.getStudentFile.mockResolvedValue(file);
    studentFileService.setDocumentReceived.mockResolvedValue({ ...file, complete: true });

    await request(app)
      .get(`${staff}/${UUID.student}/schools/${UUID.school}/file`)
      .set('Authorization', bearerFor('instructor'))
      .expect(200, file);
    expect(studentFileService.getStudentFile).toHaveBeenCalledWith(
      expect.objectContaining({ userId: TEST_USERS.instructor.userId }),
      UUID.student,
      UUID.school
    );

    await request(app)
      .put(`${staff}/${UUID.student}/schools/${UUID.school}/documents/${UUID.booking}`)
      .set('Authorization', bearerFor('instructor'))
      .send({ received: true, note: 'Reçue au bureau' })
      .expect(200);
    expect(studentFileService.setDocumentReceived).toHaveBeenCalledWith(
      expect.objectContaining({ userId: TEST_USERS.instructor.userId }),
      UUID.student,
      UUID.school,
      UUID.booking,
      true,
      'Reçue au bureau'
    );

    await request(app)
      .get(`${staff}/${UUID.student}/schools/${UUID.school}/file`)
      .set('Authorization', bearerFor('student'))
      .expect(403);
  });

  it('F7 : `received` manquant → 400 ; pièce mal formée → 404', async () => {
    const invalid = await request(app)
      .put(`${staff}/${UUID.student}/schools/${UUID.school}/documents/${UUID.booking}`)
      .set('Authorization', bearerFor('instructor'))
      .send({ note: 'sans received' });
    expect(invalid.status).toBe(400);
    expect((invalid.body as { error: string }).error).toBe('VALIDATION_ERROR');

    const bad = await request(app)
      .put(`${staff}/${UUID.student}/schools/${UUID.school}/documents/nope`)
      .set('Authorization', bearerFor('instructor'))
      .send({ received: true });
    expect(bad.status).toBe(404);
    expect(studentFileService.setDocumentReceived).not.toHaveBeenCalled();
  });

  it('F6 : l’élève lit son dossier, l’identifiant vient du jeton ; un instructeur → 403', async () => {
    studentFileService.getOwnFile.mockResolvedValue({ complete: true, documents: [] });

    await request(app)
      .get(`${self}/me/schools/${UUID.school}/file`)
      .set('Authorization', bearerFor('student'))
      .expect(200, { complete: true, documents: [] });
    expect(studentFileService.getOwnFile).toHaveBeenCalledWith(
      TEST_USERS.student.userId,
      UUID.school
    );

    await request(app)
      .get(`${self}/me/schools/${UUID.school}/file`)
      .set('Authorization', bearerFor('instructor'))
      .expect(403);
  });
});
