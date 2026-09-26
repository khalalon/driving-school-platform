import { fakePool, UUID } from '../../../../test-utils/http';
import { UserRole } from '../../types/auth.types';
import { UserRepository } from '../user.repository';

describe('UserRepository', () => {
  it('create : compte sans coordonnées → cinq colonnes nulles (D-50)', async () => {
    const { pool, query } = fakePool([{ id: UUID.student, firstName: 'Ali', lastName: 'Ben' }]);

    const user = await new UserRepository(pool).create({
      email: 'ali@x.io',
      passwordHash: 'hash',
      role: UserRole.STUDENT,
      firstName: 'Ali',
      lastName: 'Ben',
    });

    expect(user).toMatchObject({ firstName: 'Ali', lastName: 'Ben' });
    const [sql, params] = query.mock.calls[0] as [string, unknown[]];
    expect(sql).toMatch(/INSERT INTO users \(email, password_hash, role, first_name, last_name/);
    expect(sql).toMatch(/phone, date_of_birth, address, emergency_contact, emergency_phone/);
    expect(sql).toMatch(/RETURNING id, email, password_hash AS "passwordHash"/);
    expect(sql).toMatch(/first_name AS "firstName", last_name AS "lastName"/);
    expect(params).toEqual([
      'ali@x.io',
      'hash',
      'student',
      'Ali',
      'Ben',
      null,
      null,
      null,
      null,
      null,
    ]);
  });

  it('create : les coordonnées saisies partent en paramètres (D-50)', async () => {
    const { pool, query } = fakePool([{ id: UUID.student }]);

    await new UserRepository(pool).create({
      email: 'ali@x.io',
      passwordHash: 'hash',
      role: UserRole.STUDENT,
      firstName: 'Ali',
      lastName: 'Ben',
      contact: {
        phone: '+216 20 000 000',
        dateOfBirth: '2000-05-17',
        address: '12 rue de Tunis',
        emergencyContact: 'Salah Ben Ali',
        emergencyPhone: '+216 20 111 111',
      },
    });

    const [, params] = query.mock.calls[0] as [string, unknown[]];
    expect(params).toEqual([
      'ali@x.io',
      'hash',
      'student',
      'Ali',
      'Ben',
      '+216 20 000 000',
      '2000-05-17',
      '12 rue de Tunis',
      'Salah Ben Ali',
      '+216 20 111 111',
    ]);
  });

  it('findById / findByEmail : null sans ligne ; updatePassword paramétré', async () => {
    const { pool, query } = fakePool([]);
    const repo = new UserRepository(pool);

    await expect(repo.findById(UUID.student)).resolves.toBeNull();
    await expect(repo.findByEmail('nobody@x.io')).resolves.toBeNull();
    await repo.updatePassword(UUID.student, 'new-hash');

    expect((query.mock.calls[0] as [string, unknown[]])[1]).toEqual([UUID.student]);
    expect((query.mock.calls[1] as [string, unknown[]])[1]).toEqual(['nobody@x.io']);
    const [sql, params] = query.mock.calls[2] as [string, unknown[]];
    expect(sql).toMatch(/UPDATE users/);
    expect(params).toEqual(['new-hash', UUID.student]);
  });
});
