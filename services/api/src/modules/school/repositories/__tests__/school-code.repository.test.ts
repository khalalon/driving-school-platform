import { fakePool, UUID } from '../../../../test-utils/http';
import { SchoolCodeRepository } from '../school-code.repository';

describe('SchoolCodeRepository (D-17)', () => {
  it('consume : une seule instruction — actif, non expiré, quota non atteint — et uses_count + 1', async () => {
    const code = { id: 'code-1', schoolId: UUID.school, code: 'INST-SEED', role: 'instructor' };
    const { pool, query } = fakePool([code]);

    await expect(new SchoolCodeRepository(pool).consume('INST-SEED')).resolves.toEqual(code);

    const [sql, params] = query.mock.calls[0] as [string, unknown[]];
    expect(sql).toMatch(/UPDATE school_codes/);
    expect(sql).toMatch(/SET uses_count = uses_count \+ 1/);
    expect(sql).toMatch(/WHERE code = \$1/);
    expect(sql).toMatch(/AND is_active = TRUE/);
    expect(sql).toMatch(/AND \(expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP\)/);
    expect(sql).toMatch(/AND \(max_uses IS NULL OR uses_count < max_uses\)/);
    expect(sql).toMatch(/RETURNING id, school_id AS "schoolId", code, role/);
    expect(params).toEqual(['INST-SEED']);
  });

  it('consume : null quand aucun code valide ne correspond ; passe par le client de transaction fourni', async () => {
    const { pool } = fakePool([]);
    await expect(new SchoolCodeRepository(pool).consume('NOPE')).resolves.toBeNull();

    const txQuery = jest.fn().mockResolvedValue({ rows: [] });
    await new SchoolCodeRepository(pool).consume('NOPE', { query: txQuery });
    expect(txQuery).toHaveBeenCalledTimes(1);
  });
});
