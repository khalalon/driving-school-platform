import { fakePool, UUID } from '../../../../test-utils/http';
import { PushTokenRepository } from '../push-token.repository';

/**
 * Un jeton push identifie un **appareil** : l'upsert porte sur le jeton, pas sur le couple
 * (compte, jeton) — sinon un téléphone passé d'un élève à un autre enverrait les messages du
 * premier au second.
 */
describe('PushTokenRepository (17.2, D-63)', () => {
  const token = 'ExponentPushToken[abcdefghijklmnop]';

  it('upsert : conflit sur le jeton, le compte et la langue sont réécrits', async () => {
    const { pool, query } = fakePool([{ id: UUID.request, token, language: 'ar' }]);

    const saved = await new PushTokenRepository(pool).upsert(UUID.student, {
      token,
      platform: 'android',
      language: 'ar',
    });

    expect(saved).toEqual({ id: UUID.request, token, language: 'ar' });
    const [sql, params] = query.mock.calls[0] as [string, unknown[]];
    expect(sql).toMatch(/ON CONFLICT \(token\) DO UPDATE/);
    expect(sql).toMatch(/SET user_id = EXCLUDED\.user_id/);
    expect(sql).toMatch(/language = EXCLUDED\.language/);
    expect(sql).toMatch(/updated_at = CURRENT_TIMESTAMP/);
    expect(params).toEqual([UUID.student, token, 'android', 'ar']);
  });

  it('remove : seul le porteur du jeton le retire', async () => {
    const { pool, query } = fakePool([]);

    await new PushTokenRepository(pool).remove(UUID.student, token);

    const [sql, params] = query.mock.calls[0] as [string, unknown[]];
    expect(sql).toMatch(/DELETE FROM push_tokens WHERE user_id = \$1 AND token = \$2/);
    expect(params).toEqual([UUID.student, token]);
  });

  it('findByUsers : une requête pour tous les destinataires, doublons écartés, plus récent d’abord', async () => {
    const { pool, query } = fakePool([{ id: 'p1', token, language: 'fr' }]);

    const found = await new PushTokenRepository(pool).findByUsers([UUID.student, UUID.student]);

    expect(found).toHaveLength(1);
    const [sql, params] = query.mock.calls[0] as [string, unknown[]];
    expect(sql).toMatch(/WHERE user_id = ANY\(\$1::uuid\[\]\)/);
    expect(sql).toMatch(/ORDER BY updated_at DESC/);
    expect(params).toEqual([[UUID.student]]);
  });

  it('findByUsers : aucun destinataire, aucune requête', async () => {
    const { pool, query } = fakePool([]);

    await expect(new PushTokenRepository(pool).findByUsers([])).resolves.toEqual([]);
    expect(query).not.toHaveBeenCalled();
  });

  it('removeByToken : un jeton mort part sans qu’on connaisse son porteur', async () => {
    const { pool, query } = fakePool([]);

    await new PushTokenRepository(pool).removeByToken(token);

    const [sql, params] = query.mock.calls[0] as [string, unknown[]];
    expect(sql).toMatch(/DELETE FROM push_tokens WHERE token = \$1/);
    expect(params).toEqual([token]);
  });
});
