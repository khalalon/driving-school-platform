import { fakePool, UUID } from '../../../../test-utils/http';
import { ExamResult, ExamType } from '../../types/exam.types';
import { ExamRepository } from '../exam.repository';
import { RegistrationRepository } from '../registration.repository';

describe('ExamRepository', () => {
  const dateTime = new Date('2026-10-15T09:00:00Z');

  it('create : examinerId et capacity absents → null', async () => {
    const { pool, query } = fakePool([{ id: UUID.booking }]);
    await new ExamRepository(pool).create({
      schoolId: UUID.school,
      type: ExamType.THEORY,
      dateTime,
      price: 60,
    });
    expect((query.mock.calls[0] as [string, unknown[]])[1]).toEqual([
      UUID.school,
      'theory',
      dateTime,
      null,
      60,
      null,
    ]);
  });

  it('findAll : filtres facultatifs ; update : SET dynamique ; countRegistrations en nombre', async () => {
    const { pool, query } = fakePool([{ count: '3' }]);
    const repo = new ExamRepository(pool);

    await repo.findAll({ type: ExamType.PRACTICAL, dateTo: dateTime });
    const [sql, params] = query.mock.calls[0] as [string, unknown[]];
    expect(sql).toMatch(/WHERE type = \$1 AND date_time <= \$2/);
    expect(params).toEqual(['practical', dateTime]);

    await repo.update(UUID.booking, { capacity: 10 });
    expect((query.mock.calls[1] as [string, unknown[]])[1]).toEqual([10, UUID.booking]);

    await expect(repo.countRegistrations(UUID.booking)).resolves.toBe(3);
    await repo.delete(UUID.booking);
    await expect(new ExamRepository(fakePool([]).pool).findById('x')).resolves.toBeNull();
  });
});

describe('RegistrationRepository', () => {
  it('create : résultat pending ; updateResult : score et notes facultatifs', async () => {
    const { pool, query } = fakePool([{ id: UUID.request }]);
    const repo = new RegistrationRepository(pool);

    await repo.create(UUID.booking, UUID.student);
    expect((query.mock.calls[0] as [string, unknown[]])[1]).toEqual([
      UUID.booking,
      UUID.student,
      'pending',
    ]);

    await repo.updateResult(UUID.request, { result: ExamResult.PASSED, score: 18 });
    const [sql, params] = query.mock.calls[1] as [string, unknown[]];
    expect(sql).toMatch(
      /SET result = \$1, score = \$2, updated_at = CURRENT_TIMESTAMP WHERE id = \$3/
    );
    expect(params).toEqual(['passed', 18, UUID.request]);
  });

  it('lectures, suppression, compte de leçons pointées', async () => {
    const row = { id: UUID.request };
    const { pool } = fakePool([row]);
    const repo = new RegistrationRepository(pool);

    await expect(repo.findById(UUID.request)).resolves.toEqual(row);
    await expect(repo.findByExamId(UUID.booking)).resolves.toEqual([row]);
    await expect(repo.findByStudentId(UUID.student)).resolves.toEqual([row]);
    await expect(repo.findByExamAndStudent(UUID.booking, UUID.student)).resolves.toEqual(row);
    await repo.delete(UUID.request);

    const counting = new RegistrationRepository(fakePool([{ count: '12' }]).pool);
    await expect(counting.countCompletedLessons(UUID.student)).resolves.toBe(12);
    await expect(new RegistrationRepository(fakePool([]).pool).findById('x')).resolves.toBeNull();
  });
});

describe('ExamRepository — toutes les branches des constructeurs SQL', () => {
  it('findAll avec tous les filtres ; update avec tous les champs ; create complet', async () => {
    const dateFrom = new Date('2026-10-01T00:00:00Z');
    const dateTo = new Date('2026-10-31T00:00:00Z');
    const { pool, query } = fakePool([{ id: UUID.booking }]);
    const repo = new ExamRepository(pool);

    await repo.findAll({ schoolId: UUID.school, type: ExamType.THEORY, dateFrom, dateTo });
    expect((query.mock.calls[0] as [string])[0]).toMatch(
      /WHERE school_id = \$1 AND type = \$2 AND date_time >= \$3 AND date_time <= \$4/
    );

    await repo.update(UUID.booking, {
      dateTime: dateFrom,
      examinerId: UUID.instructor,
      price: 80,
      capacity: 5,
    });
    const [sqlUpd, paramsUpd] = query.mock.calls[1] as [string, unknown[]];
    expect(sqlUpd).toMatch(
      /SET date_time = \$1, examiner_id = \$2, price = \$3, capacity = \$4, updated_at = CURRENT_TIMESTAMP WHERE id = \$5/
    );
    expect(paramsUpd).toEqual([dateFrom, UUID.instructor, 80, 5, UUID.booking]);

    await repo.create({
      schoolId: UUID.school,
      type: ExamType.PRACTICAL,
      dateTime: dateFrom,
      examinerId: UUID.instructor,
      price: 90,
      capacity: 3,
    });
    expect((query.mock.calls[2] as [string, unknown[]])[1]).toEqual([
      UUID.school,
      'practical',
      dateFrom,
      UUID.instructor,
      90,
      3,
    ]);
  });
});
