/**
 * Disponibilités des instructeurs (15.6, D-60) : validation de la semaine type, dépôt
 * (remplacement d'un bloc dans une transaction), service (la sienne seulement) et routes I1–I2.
 */
import request from 'supertest';
import { createApp } from '../../../app';
import { ITransactionRunner, Queryable } from '../../../db/transaction';
import { validate } from '../../../http/validation';
import { bearerFor, fakePool, TEST_USERS, testRequireAuth, UUID } from '../../../test-utils/http';
import { UserRole } from '../../../types/auth';
import { AvailabilityController } from '../controllers/availability.controller';
import { AvailabilityRepository } from '../repositories/availability.repository';
import { createAvailabilityRouter } from '../routes/availability.routes';
import { AvailabilityService } from '../services/availability.service';
import { DEFAULT_SLOT_MINUTES, FreeSlotsService } from '../services/free-slots.service';
import { FreeSlotsController } from '../controllers/free-slots.controller';
import { LessonController } from '../controllers/lesson.controller';
import { createLessonRouter } from '../routes/lesson.routes';
import { LessonService } from '../services/lesson.service';
import { LessonType } from '../../../types/domain';
import {
  freeSlotsQuerySchema,
  MAX_AVAILABILITY_SLOTS,
  replaceAvailabilitySchema,
} from '../validators/availability.validator';

const monday = (startTime: string, endTime: string) => ({ weekday: 1, startTime, endTime });

describe('replaceAvailabilitySchema', () => {
  it('accepte des plages valides, triées par jour puis heure ; liste vide = tout effacer', () => {
    const parsed = validate(replaceAvailabilitySchema, {
      slots: [
        { weekday: 3, startTime: '14:00', endTime: '18:00' },
        monday('12:00', '14:00'),
        monday('09:00', '12:00'),
      ],
    });
    expect(parsed.ok && parsed.value.slots).toEqual([
      monday('09:00', '12:00'),
      monday('12:00', '14:00'),
      { weekday: 3, startTime: '14:00', endTime: '18:00' },
    ]);
    expect(validate(replaceAvailabilitySchema, { slots: [] }).ok).toBe(true);
  });

  it('refuse un chevauchement le même jour, une plage à l’envers, un format ou un jour faux', () => {
    const overlap = validate(replaceAvailabilitySchema, {
      slots: [monday('09:00', '12:00'), monday('11:00', '13:00')],
    });
    expect(overlap.ok).toBe(false);
    expect(!overlap.ok && overlap.detail).toMatch(/chevauchent/);

    // Même heure, jours différents : pas un chevauchement
    expect(
      validate(replaceAvailabilitySchema, {
        slots: [monday('09:00', '12:00'), { weekday: 2, startTime: '09:00', endTime: '12:00' }],
      }).ok
    ).toBe(true);

    const backwards = validate(replaceAvailabilitySchema, { slots: [monday('12:00', '09:00')] });
    expect(!backwards.ok && backwards.detail).toMatch(/finir après son début/);
    expect(validate(replaceAvailabilitySchema, { slots: [monday('9h', '12:00')] }).ok).toBe(false);
    expect(validate(replaceAvailabilitySchema, { slots: [monday('24:00', '25:00')] }).ok).toBe(
      false
    );
    expect(
      validate(replaceAvailabilitySchema, {
        slots: [{ weekday: 7, startTime: '09:00', endTime: '10:00' }],
      }).ok
    ).toBe(false);
    expect(validate(replaceAvailabilitySchema, {}).ok).toBe(false);
    const tooMany = Array.from({ length: MAX_AVAILABILITY_SLOTS + 1 }, (_, i) => ({
      weekday: i % 7,
      startTime: '08:00',
      endTime: '08:30',
    }));
    expect(validate(replaceAvailabilitySchema, { slots: tooMany }).ok).toBe(false);
  });
});

describe('AvailabilityRepository', () => {
  it('lecture : heures en HH:MM, triées par jour puis début', async () => {
    const { pool, query } = fakePool([monday('09:00', '12:00')]);
    const repo = new AvailabilityRepository(pool, {
      run: jest.fn(),
    } as unknown as ITransactionRunner);

    await expect(repo.findByInstructor(UUID.instructor)).resolves.toEqual([
      monday('09:00', '12:00'),
    ]);
    const [sql, params] = query.mock.calls[0] as [string, unknown[]];
    expect(sql).toMatch(/to_char\(start_time, 'HH24:MI'\) AS "startTime"/);
    expect(sql).toMatch(/ORDER BY weekday ASC, start_time ASC/);
    expect(params).toEqual([UUID.instructor]);
  });

  it('remplacement : suppression puis insertions dans une seule transaction, puis relecture', async () => {
    const tx: Queryable = { query: jest.fn().mockResolvedValue({ rows: [] }) };
    const run = jest.fn((work: (client: Queryable) => Promise<unknown>) => work(tx));
    const { pool } = fakePool([monday('09:00', '12:00')]);
    const repo = new AvailabilityRepository(pool, { run } as unknown as ITransactionRunner);

    await repo.replace(UUID.instructor, [monday('09:00', '12:00'), monday('14:00', '17:00')]);
    expect(run).toHaveBeenCalledTimes(1);
    const calls = (tx.query as jest.Mock).mock.calls as [string, unknown[]][];
    expect(calls[0][0]).toMatch(/DELETE FROM instructor_availability WHERE instructor_id = \$1/);
    expect(calls.slice(1).map(([, params]) => params)).toEqual([
      [UUID.instructor, 1, '09:00', '12:00'],
      [UUID.instructor, 1, '14:00', '17:00'],
    ]);
  });
});

describe('AvailabilityService', () => {
  const repository = { findByInstructor: jest.fn(), replace: jest.fn(), findFreeSlots: jest.fn() };
  const instructors = { findById: jest.fn(), findByUserId: jest.fn() };
  const service = new AvailabilityService(repository, instructors);
  const instructor = { userId: 'user-instr', email: 'i@x.io', role: UserRole.INSTRUCTOR };

  beforeEach(() => {
    jest.clearAllMocks();
    instructors.findByUserId.mockResolvedValue({ id: 'instr-1', schoolId: 'school-1' });
  });

  it('lit et remplace la semaine type de l’instructeur connecté', async () => {
    repository.findByInstructor.mockResolvedValue([]);
    await service.getMine(instructor);
    expect(repository.findByInstructor).toHaveBeenCalledWith('instr-1');

    await service.replaceMine(instructor, { slots: [monday('09:00', '12:00')] });
    expect(repository.replace).toHaveBeenCalledWith('instr-1', [monday('09:00', '12:00')]);
  });

  it('instructeur sans fiche : 403 FORBIDDEN_SCHOOL, rien n’est écrit', async () => {
    instructors.findByUserId.mockResolvedValue(null);
    await expect(service.replaceMine(instructor, { slots: [] })).rejects.toMatchObject({
      status: 403,
      code: 'FORBIDDEN_SCHOOL',
    });
    expect(repository.replace).not.toHaveBeenCalled();
  });
});

describe('Routes /api/instructors/me/availability (I1, I2)', () => {
  const availabilityService = { getMine: jest.fn(), replaceMine: jest.fn() };
  const app = createApp({
    auth: createAvailabilityRouter(
      new AvailabilityController(availabilityService as unknown as AvailabilityService),
      testRequireAuth
    ),
  });
  const url = '/api/auth/me/availability';

  beforeEach(() => jest.clearAllMocks());

  it('instructeur seulement : 401 sans jeton, 403 pour un élève', async () => {
    await request(app).get(url).expect(401);
    await request(app).get(url).set('Authorization', bearerFor('student')).expect(403);
    await request(app)
      .put(url)
      .set('Authorization', bearerFor('admin'))
      .send({ slots: [] })
      .expect(403);
  });

  it('I1 lit, I2 remplace avec les plages triées ; 400 sur un chevauchement', async () => {
    availabilityService.getMine.mockResolvedValue([monday('09:00', '12:00')]);
    await request(app)
      .get(url)
      .set('Authorization', bearerFor('instructor'))
      .expect(200, [monday('09:00', '12:00')]);

    availabilityService.replaceMine.mockResolvedValue([]);
    await request(app)
      .put(url)
      .set('Authorization', bearerFor('instructor'))
      .send({ slots: [monday('14:00', '16:00'), monday('09:00', '12:00')] })
      .expect(200);
    expect(availabilityService.replaceMine).toHaveBeenCalledWith(
      expect.objectContaining({ userId: TEST_USERS.instructor.userId }),
      { slots: [monday('09:00', '12:00'), monday('14:00', '16:00')] }
    );

    const overlap = await request(app)
      .put(url)
      .set('Authorization', bearerFor('instructor'))
      .send({ slots: [monday('09:00', '12:00'), monday('10:00', '11:00')] });
    expect(overlap.status).toBe(400);
    expect((overlap.body as { error: string }).error).toBe('VALIDATION_ERROR');
    expect(availabilityService.replaceMine).toHaveBeenCalledTimes(1);
  });
});

describe('créneaux libres (L10, 15.7, D-60)', () => {
  const from = new Date('2026-10-12T00:00:00.000Z');
  const to = new Date('2026-10-19T00:00:00.000Z');

  it('freeSlotsQuerySchema : type D-18, from < to, plage ≤ 14 jours', () => {
    const ok = validate(freeSlotsQuerySchema, {
      type: 'Parc',
      from: from.toISOString(),
      to: to.toISOString(),
    });
    expect(ok.ok && ok.value).toEqual({ type: 'Parc', from, to });
    const tooLong = validate(freeSlotsQuerySchema, {
      type: 'Parc',
      from: '2026-10-01T00:00:00.000Z',
      to: '2026-10-16T00:00:00.000Z',
    });
    expect(!tooLong.ok && tooLong.detail).toMatch(/14 jours/);
    expect(validate(freeSlotsQuerySchema, { type: 'PRACTICAL', from, to }).ok).toBe(false);
    expect(
      validate(freeSlotsQuerySchema, {
        type: 'CODE',
        from: to.toISOString(),
        to: from.toISOString(),
      }).ok
    ).toBe(false);
  });

  it('dépôt : créneaux tirés des disponibilités en heure de l’école, moins les leçons planifiées', async () => {
    const { pool, query } = fakePool([]);
    const repo = new AvailabilityRepository(pool, {
      run: jest.fn(),
    } as unknown as ITransactionRunner);

    await repo.findFreeSlots({ schoolId: UUID.school, from, to, durationMinutes: 45 });
    const [sql, params] = query.mock.calls[0] as [string, unknown[]];
    expect(params).toEqual([from, to, UUID.school, 45]);
    expect(sql).toMatch(/AT TIME ZONE 'Africa\/Tunis'/);
    expect(sql).toMatch(/EXTRACT\(DOW FROM days\.day\) = a\.weekday/);
    expect(sql).toMatch(
      /generate_series\(\s*days\.day \+ a\.start_time, days\.day \+ a\.end_time - p\.len, p\.len/
    );
    expect(sql).toMatch(/s\.start_utc > \(now\(\) AT TIME ZONE 'UTC'\)/);
    expect(sql).toMatch(/NOT EXISTS \(\s*SELECT 1 FROM lessons l/);
    expect(sql).toMatch(/l\.status = 'scheduled'/);
  });

  describe('FreeSlotsService', () => {
    const students = { findByUserId: jest.fn() };
    const pricing = { getPricingByType: jest.fn() };
    const availability = {
      findByInstructor: jest.fn(),
      replace: jest.fn(),
      findFreeSlots: jest.fn(),
    };
    const service = new FreeSlotsService(students, pricing, availability);
    const student = { userId: 'user-1', email: 's@x.io', role: UserRole.STUDENT };

    beforeEach(() => {
      jest.clearAllMocks();
      students.findByUserId.mockResolvedValue({
        id: 'row-1',
        schoolId: 'school-1',
        authorized: true,
      });
      availability.findFreeSlots.mockResolvedValue([]);
    });

    it('durée du tarif du type (S4), école de l’inscription approuvée (D-22)', async () => {
      pricing.getPricingByType.mockResolvedValue({ price: 40, duration: 45 });
      await service.getFreeSlots(student, { type: LessonType.PARC, from, to });
      expect(pricing.getPricingByType).toHaveBeenCalledWith('school-1', LessonType.PARC);
      expect(availability.findFreeSlots).toHaveBeenCalledWith({
        schoolId: 'school-1',
        from,
        to,
        durationMinutes: 45,
      });
    });

    it('sans tarif pour le type : 60 min', async () => {
      pricing.getPricingByType.mockResolvedValue(null);
      await service.getFreeSlots(student, { type: LessonType.CODE, from, to });
      expect(availability.findFreeSlots).toHaveBeenCalledWith(
        expect.objectContaining({ durationMinutes: DEFAULT_SLOT_MINUTES })
      );
      expect(DEFAULT_SLOT_MINUTES).toBe(60);
    });

    it('sans inscription approuvée : 403 NOT_ENROLLED, rien n’est calculé', async () => {
      students.findByUserId.mockResolvedValue({
        id: 'row-1',
        schoolId: 'school-1',
        authorized: false,
      });
      await expect(
        service.getFreeSlots(student, { type: LessonType.CODE, from, to })
      ).rejects.toMatchObject({ status: 403, code: 'NOT_ENROLLED' });
      students.findByUserId.mockResolvedValue(null);
      await expect(
        service.getFreeSlots(student, { type: LessonType.CODE, from, to })
      ).rejects.toMatchObject({ code: 'NOT_ENROLLED' });
      expect(availability.findFreeSlots).not.toHaveBeenCalled();
    });
  });

  it('route GET /free-slots : élève seulement, requête validée, avant /:id', async () => {
    const freeSlotsService = { getFreeSlots: jest.fn().mockResolvedValue([]) };
    const lessonService = { getLesson: jest.fn() };
    const app = createApp({
      auth: createLessonRouter(
        new LessonController(lessonService as unknown as LessonService),
        testRequireAuth,
        new FreeSlotsController(freeSlotsService as unknown as FreeSlotsService)
      ),
    });
    const url = `/api/auth/free-slots?type=Parc&from=${from.toISOString()}&to=${to.toISOString()}`;

    await request(app).get(url).expect(401);
    await request(app).get(url).set('Authorization', bearerFor('instructor')).expect(403);
    await request(app).get(url).set('Authorization', bearerFor('student')).expect(200, []);
    expect(freeSlotsService.getFreeSlots).toHaveBeenCalledWith(
      expect.objectContaining({ userId: TEST_USERS.student.userId }),
      { type: 'Parc', from, to }
    );
    expect(lessonService.getLesson).not.toHaveBeenCalled();
    await request(app)
      .get('/api/auth/free-slots?type=Parc')
      .set('Authorization', bearerFor('student'))
      .expect(400);
  });
});
