import request from 'supertest';
import { createApp } from '../../../app';
import { bearerFor, TEST_USERS, testRequireAuth, UUID } from '../../../test-utils/http';
import { SchoolController } from '../controllers/school.controller';
import { createSchoolRouter } from '../routes/school.routes';
import { InstructorService } from '../services/instructor.service';
import { PricingService } from '../services/pricing.service';
import { SchoolService } from '../services/school.service';

describe('Routes /api/schools (S1–S4 + administration)', () => {
  const schoolService = {
    createSchool: jest.fn(),
    getSchoolStudents: jest.fn(),
    getSchoolById: jest.fn(),
    getAllSchools: jest.fn(),
    updateSchool: jest.fn(),
    deleteSchool: jest.fn(),
  };
  const instructorService = {
    addInstructor: jest.fn(),
    getInstructorById: jest.fn(),
    getInstructorsBySchool: jest.fn(),
    updateInstructor: jest.fn(),
    deleteInstructor: jest.fn(),
  };
  const pricingService = {
    setPricing: jest.fn(),
    getPricingBySchool: jest.fn(),
    getPricingByType: jest.fn(),
    deletePricing: jest.fn(),
  };
  const app = createApp({
    auth: createSchoolRouter(
      new SchoolController(
        schoolService as unknown as SchoolService,
        instructorService as unknown as InstructorService,
        pricingService as unknown as PricingService
      ),
      testRequireAuth
    ),
  });
  const base = '/api/auth';
  const school = { id: UUID.school, name: 'Seed Driving School', logoUrl: null };
  const validSchool = {
    name: 'Auto-école Test',
    address: '1 rue du Test, Tunis',
    phone: '+21600000000',
    email: 'contact@test.io',
  };

  beforeEach(() => jest.clearAllMocks());

  it('S1/S2 : lecture publique ; identifiant mal formé → 404 NOT_FOUND', async () => {
    schoolService.getAllSchools.mockResolvedValue([school]);
    schoolService.getSchoolById.mockResolvedValue(school);

    await request(app).get(base).expect(200, [school]);
    await request(app).get(`${base}/${UUID.school}`).expect(200, school);

    const bad = await request(app).get(`${base}/nope`);
    expect(bad.status).toBe(404);
    expect(bad.body).toEqual({ error: 'NOT_FOUND', message: 'École introuvable' });
  });

  it('S3/S4 : instructeurs et tarifs d’une école, publics', async () => {
    instructorService.getInstructorsBySchool.mockResolvedValue([]);
    pricingService.getPricingBySchool.mockResolvedValue([]);

    await request(app).get(`${base}/${UUID.school}/instructors`).expect(200, []);
    await request(app).get(`${base}/${UUID.school}/pricing`).expect(200, []);
    expect(instructorService.getInstructorsBySchool).toHaveBeenCalledWith(UUID.school);
  });

  it('écriture : 401 sans jeton, 403 instructeur, 201 admin, 400 payload invalide', async () => {
    schoolService.createSchool.mockResolvedValue(school);

    await request(app).post(base).send(validSchool).expect(401);
    await request(app)
      .post(base)
      .set('Authorization', bearerFor('instructor'))
      .send(validSchool)
      .expect(403);
    const ok = await request(app)
      .post(base)
      .set('Authorization', bearerFor('admin'))
      .send(validSchool);
    expect(ok.status).toBe(201);
    expect(schoolService.createSchool).toHaveBeenCalledWith(validSchool);

    const bad = await request(app)
      .post(base)
      .set('Authorization', bearerFor('admin'))
      .send({ name: 'X' });
    expect(bad.status).toBe(400);
    expect(bad.body).toMatchObject({ error: 'VALIDATION_ERROR' });
  });

  it('POST/PUT école : devise ISO 4217 acceptée en majuscules, refusée sinon (D-43)', async () => {
    schoolService.createSchool.mockResolvedValue({ ...school, currency: 'EUR' });
    schoolService.updateSchool.mockResolvedValue({ ...school, currency: 'EUR' });
    const auth = bearerFor('admin');

    const created = await request(app)
      .post(base)
      .set('Authorization', auth)
      .send({ ...validSchool, currency: 'eur' });
    expect(created.status).toBe(201);
    expect(schoolService.createSchool).toHaveBeenCalledWith({ ...validSchool, currency: 'EUR' });

    const updated = await request(app)
      .put(`${base}/${UUID.school}`)
      .set('Authorization', auth)
      .send({ currency: 'EUR' });
    expect(updated.status).toBe(200);
    expect(schoolService.updateSchool).toHaveBeenCalledWith(
      expect.objectContaining({ role: 'admin' }),
      UUID.school,
      { currency: 'EUR' }
    );

    const bad = await request(app)
      .put(`${base}/${UUID.school}`)
      .set('Authorization', auth)
      .send({ currency: 'dinars' });
    expect(bad.status).toBe(400);
    expect(bad.body).toMatchObject({ error: 'VALIDATION_ERROR' });
  });

  it('PUT/DELETE école : mise à jour partielle, suppression 204, corps vide → 400', async () => {
    schoolService.updateSchool.mockResolvedValue({ ...school, name: 'Nouvelle' });
    schoolService.deleteSchool.mockResolvedValue(undefined);
    const auth = bearerFor('admin');

    const res = await request(app)
      .put(`${base}/${UUID.school}`)
      .set('Authorization', auth)
      .send({ name: 'Nouvelle' });
    expect(res.status).toBe(200);
    expect(schoolService.updateSchool).toHaveBeenCalledWith(
      expect.objectContaining({ role: 'admin' }),
      UUID.school,
      { name: 'Nouvelle' }
    );

    await request(app)
      .put(`${base}/${UUID.school}`)
      .set('Authorization', auth)
      .send({})
      .expect(400);
    await request(app).delete(`${base}/${UUID.school}`).set('Authorization', auth).expect(204);
  });

  it('S6 GET /:schoolId/students : instructeur ou admin (401 sans jeton, 403 élève), liste renvoyée', async () => {
    const roster = [{ studentId: UUID.student, firstName: 'Élève', lastName: 'Test' }];
    schoolService.getSchoolStudents.mockResolvedValue(roster);

    await request(app).get(`${base}/${UUID.school}/students`).expect(401);
    await request(app)
      .get(`${base}/${UUID.school}/students`)
      .set('Authorization', bearerFor('student'))
      .expect(403);
    await request(app)
      .get(`${base}/${UUID.school}/students`)
      .set('Authorization', bearerFor('instructor'))
      .expect(200, roster);
    expect(schoolService.getSchoolStudents).toHaveBeenCalledWith(
      expect.objectContaining({ userId: TEST_USERS.instructor.userId }),
      UUID.school
    );
  });

  it('instructeurs : ajout vérifie l’école, lecture/maj/suppression par id', async () => {
    schoolService.getSchoolById.mockResolvedValue(school);
    instructorService.addInstructor.mockResolvedValue({ id: UUID.instructor });
    instructorService.getInstructorById.mockResolvedValue({ id: UUID.instructor });
    instructorService.updateInstructor.mockResolvedValue({ id: UUID.instructor });
    instructorService.deleteInstructor.mockResolvedValue(undefined);
    const auth = bearerFor('admin');
    const body = {
      userId: UUID.student,
      name: 'Nouvel Instructeur',
      phone: '+21600000009',
      licenseNumber: 'LIC-0009',
      specialties: ['Parc'],
    };

    const created = await request(app)
      .post(`${base}/${UUID.school}/instructors`)
      .set('Authorization', auth)
      .send(body);
    expect(created.status).toBe(201);
    expect(instructorService.addInstructor).toHaveBeenCalledWith(UUID.school, body);

    // §8 du contrat : lecture d'une fiche instructeur réservée à l'admin (5.7).
    await request(app).get(`${base}/instructors/${UUID.instructor}`).expect(401);
    await request(app)
      .get(`${base}/instructors/${UUID.instructor}`)
      .set('Authorization', auth)
      .expect(200);
    await request(app)
      .put(`${base}/instructors/${UUID.instructor}`)
      .set('Authorization', auth)
      .send({ phone: '+21600000010' })
      .expect(200);
    await request(app)
      .delete(`${base}/instructors/${UUID.instructor}`)
      .set('Authorization', auth)
      .expect(204);
  });

  it('S7–S9 (D-51) : un instructeur tient la fiche et la grille de son école, un élève non', async () => {
    schoolService.getSchoolById.mockResolvedValue(school);
    schoolService.updateSchool.mockResolvedValue({ ...school, phone: '+21611111111' });
    pricingService.setPricing.mockResolvedValue({ id: 'p1', lessonType: 'Parc', price: 40 });
    pricingService.deletePricing.mockResolvedValue(undefined);
    const instructor = bearerFor('instructor');

    await request(app)
      .put(`${base}/${UUID.school}`)
      .set('Authorization', instructor)
      .send({ phone: '+21611111111' })
      .expect(200);
    // Le cloisonnement par école (403 FORBIDDEN_SCHOOL) est joué par le service, pas par la route
    expect(schoolService.updateSchool).toHaveBeenCalledWith(
      expect.objectContaining({ role: 'instructor' }),
      UUID.school,
      { phone: '+21611111111' }
    );

    await request(app)
      .post(`${base}/${UUID.school}/pricing`)
      .set('Authorization', instructor)
      .send({ lessonType: 'Parc', price: 40, duration: 60 })
      .expect(201);

    await request(app)
      .delete(`${base}/pricing/${UUID.instructor}`)
      .set('Authorization', instructor)
      .expect(204);

    // Un élève reste dehors
    const student = bearerFor('student');
    await request(app)
      .put(`${base}/${UUID.school}`)
      .set('Authorization', student)
      .send({ phone: '+21611111111' })
      .expect(403);
    await request(app)
      .post(`${base}/${UUID.school}/pricing`)
      .set('Authorization', student)
      .send({ lessonType: 'Parc', price: 40, duration: 60 })
      .expect(403);
  });

  it('tarifs : lessonType hors vocabulaire D-18 → 400 ; Parc → 201 ; suppression 204', async () => {
    schoolService.getSchoolById.mockResolvedValue(school);
    pricingService.setPricing.mockResolvedValue({ id: 'p1', lessonType: 'Parc', price: 40 });
    pricingService.deletePricing.mockResolvedValue(undefined);
    const auth = bearerFor('admin');

    const bad = await request(app)
      .post(`${base}/${UUID.school}/pricing`)
      .set('Authorization', auth)
      .send({ lessonType: 'DRIVING', price: 40, duration: 60 });
    expect(bad.status).toBe(400);

    const ok = await request(app)
      .post(`${base}/${UUID.school}/pricing`)
      .set('Authorization', auth)
      .send({ lessonType: 'Parc', price: 40, duration: 60 });
    expect(ok.status).toBe(201);
    expect(pricingService.setPricing).toHaveBeenCalledWith(
      expect.objectContaining({ role: 'admin' }),
      UUID.school,
      { lessonType: 'Parc', price: 40, duration: 60 }
    );

    await request(app)
      .delete(`${base}/pricing/${UUID.instructor}`)
      .set('Authorization', auth)
      .expect(204);
  });
});
