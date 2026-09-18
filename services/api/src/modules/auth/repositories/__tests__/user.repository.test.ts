import { fakePool, UUID } from '../../../../test-utils/http';
import { UserRole } from '../../types/auth.types';
import { UserRepository } from '../user.repository';

describe('UserRepository', () => {
  it('create : cinq paramètres positionnels (email, hash, rôle, prénom, nom), noms renvoyés', async () => {
    const { pool, query } = fakePool([{ id: UUID.student, firstName: 'Ali', lastName: 'Ben' }]);

    const user = await new UserRepository(pool).create(
      'ali@x.io',
      'hash',
      UserRole.STUDENT,
      'Ali',
      'Ben'
    );

    expect(user).toMatchObject({ firstName: 'Ali', lastName: 'Ben' });
    const [sql, params] = query.mock.calls[0] as [string, unknown[]];
    expect(sql).toMatch(/INSERT INTO users \(email, password_hash, role, first_name, last_name/);
    expect(sql).toMatch(/VALUES \(\$1, \$2, \$3, \$4, \$5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP\)/);
    expect(sql).toMatch(/RETURNING id, email, password_hash AS "passwordHash"/);
    expect(sql).toMatch(/first_name AS "firstName", last_name AS "lastName"/);
    expect(params).toEqual(['ali@x.io', 'hash', 'student', 'Ali', 'Ben']);
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
