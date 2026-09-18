import { LessonType } from '../../../../types/domain';
import { fakePool, UUID } from '../../../../test-utils/http';
import { InstructorRepository } from '../instructor.repository';
import { PricingRepository } from '../pricing.repository';
import { SchoolRepository } from '../school.repository';

describe('SchoolRepository', () => {
  it('create : logoUrl absent → null ; colonnes aliasées en camelCase', async () => {
    const { pool, query } = fakePool([{ id: UUID.school, logoUrl: null }]);
    const repo = new SchoolRepository(pool);

    const result = await repo.create({
      name: 'École',
      address: '1 rue du Test',
      phone: '+216',
      email: 'e@x.io',
    });

    expect(result).toEqual({ id: UUID.school, logoUrl: null });
    const [sql, params] = query.mock.calls[0] as [string, unknown[]];
    expect(sql).toMatch(/logo_url AS "logoUrl"/);
    expect(params).toEqual(['École', '1 rue du Test', '+216', 'e@x.io', null]);
  });

  it('update : les champs absents passent en null pour COALESCE', async () => {
    const { pool, query } = fakePool([{ id: UUID.school }]);
    await new SchoolRepository(pool).update(UUID.school, { phone: '+21699' });

    const [, params] = query.mock.calls[0] as [string, unknown[]];
    expect(params).toEqual([UUID.school, null, null, '+21699', null, null]);
  });

  it('findById / findAll / delete', async () => {
    const { pool, query } = fakePool([{ id: UUID.school }]);
    const repo = new SchoolRepository(pool);

    await expect(repo.findById(UUID.school)).resolves.toEqual({ id: UUID.school });
    await expect(repo.findAll()).resolves.toEqual([{ id: UUID.school }]);
    await repo.delete(UUID.school);
    expect((query.mock.calls[2] as [string, unknown[]])[0]).toMatch(/DELETE FROM schools/);
    await expect(new SchoolRepository(fakePool([]).pool).findById('x')).resolves.toBeNull();
  });
});

describe('InstructorRepository', () => {
  it('create : name facultatif (null) ; relecture jointe à users pour firstName / lastName', async () => {
    const query = jest
      .fn()
      .mockResolvedValueOnce({ rows: [{ id: UUID.instructor }] })
      .mockResolvedValueOnce({
        rows: [{ id: UUID.instructor, firstName: 'Seed', lastName: 'Instructor', name: null }],
      });
    const repo = new InstructorRepository({ query } as unknown as import('pg').Pool);

    const created = await repo.create(UUID.school, {
      userId: 'user-1',
      phone: '+216',
      licenseNumber: 'LIC-1',
      specialties: ['Parc'],
    });

    expect(created).toMatchObject({ firstName: 'Seed', lastName: 'Instructor' });
    const [insertSql, params] = query.mock.calls[0] as [string, unknown[]];
    expect(insertSql).toMatch(/INSERT INTO instructors/);
    expect(params).toEqual([UUID.school, 'user-1', null, '+216', 'LIC-1', ['Parc']]);
    const [selectSql] = query.mock.calls[1] as [string, unknown[]];
    expect(selectSql).toMatch(/LEFT JOIN users u ON i\.user_id = u\.id/);
    expect(selectSql).toMatch(/COALESCE\(u\.first_name, ''\) AS "firstName"/);
  });

  it('create : erreur si la ligne écrite est introuvable à la relecture', async () => {
    const query = jest
      .fn()
      .mockResolvedValueOnce({ rows: [{ id: UUID.instructor }] })
      .mockResolvedValueOnce({ rows: [] });
    const repo = new InstructorRepository({ query } as unknown as import('pg').Pool);

    await expect(
      repo.create(UUID.school, { userId: 'u', phone: '+216', licenseNumber: 'L', specialties: [] })
    ).rejects.toThrow(/introuvable après écriture/);
  });

  it('update partiel, lectures, suppression', async () => {
    const { pool, query } = fakePool([{ id: UUID.instructor }]);
    const repo = new InstructorRepository(pool);

    await expect(repo.update(UUID.instructor, { specialties: ['CODE'] })).resolves.toEqual({
      id: UUID.instructor,
    });
    expect((query.mock.calls[0] as [string, unknown[]])[1]).toEqual([
      UUID.instructor,
      null,
      null,
      null,
      ['CODE'],
    ]);
    expect((query.mock.calls[1] as [string, unknown[]])[0]).toMatch(/WHERE i\.id = \$1/);
    await expect(repo.findById(UUID.instructor)).resolves.toEqual({ id: UUID.instructor });
    await expect(repo.findBySchoolId(UUID.school)).resolves.toEqual([{ id: UUID.instructor }]);
    await repo.delete(UUID.instructor);
    await expect(new InstructorRepository(fakePool([]).pool).findById('x')).resolves.toBeNull();
  });
});

describe('PricingRepository', () => {
  it('setPricing : upsert (école × type) ; price renvoyé en nombre', async () => {
    const { pool, query } = fakePool([{ id: 'p1', lessonType: 'Parc', price: 40 }]);
    const repo = new PricingRepository(pool);

    const result = await repo.setPricing(UUID.school, {
      lessonType: LessonType.PARC,
      price: 40,
      duration: 60,
    });

    expect(result.price).toBe(40);
    const [sql, params] = query.mock.calls[0] as [string, unknown[]];
    expect(sql).toMatch(/ON CONFLICT \(school_id, lesson_type\)/);
    expect(sql).toMatch(/price::float8 AS price/);
    expect(params).toEqual([UUID.school, 'Parc', 40, 60]);
  });

  it('findBySchoolId / findBySchoolAndType / delete', async () => {
    const { pool, query } = fakePool([{ id: 'p1' }]);
    const repo = new PricingRepository(pool);

    await expect(repo.findBySchoolId(UUID.school)).resolves.toEqual([{ id: 'p1' }]);
    await expect(repo.findBySchoolAndType(UUID.school, LessonType.CODE)).resolves.toEqual({
      id: 'p1',
    });
    expect((query.mock.calls[1] as [string, unknown[]])[1]).toEqual([UUID.school, 'CODE']);
    await repo.delete('p1');
    await expect(
      new PricingRepository(fakePool([]).pool).findBySchoolAndType(UUID.school, LessonType.PARC)
    ).resolves.toBeNull();
  });
});
