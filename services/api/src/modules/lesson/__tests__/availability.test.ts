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
import {
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
  const repository = { findByInstructor: jest.fn(), replace: jest.fn() };
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
