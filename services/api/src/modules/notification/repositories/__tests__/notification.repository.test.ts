import { fakePool, UUID } from '../../../../test-utils/http';
import { NotificationType } from '../../types/notification.types';
import { NotificationRepository } from '../notification.repository';

/** Historique de D-66 : la table `notifications` de 001, plus la destination ajoutée en 019. */
describe('NotificationRepository (17.3, D-66)', () => {
  it('insert : type, textes et destination ; `read` est laissé à son défaut', async () => {
    const { pool, query } = fakePool([{ id: 'n1', read: false }]);

    const stored = await new NotificationRepository(pool).insert({
      userId: UUID.student,
      type: NotificationType.LESSON_SCHEDULED,
      title: 'Leçon planifiée',
      message: 'Votre leçon Parc est fixée au 15/10/2026 10:00.',
      data: { screen: 'MyLessons', id: 'lesson-1' },
    });

    expect(stored).toEqual({ id: 'n1', read: false });
    const [sql, params] = query.mock.calls[0] as [string, unknown[]];
    expect(sql).toMatch(/INSERT INTO notifications \(user_id, type, title, message, data\)/);
    // `read` n'est pas écrit : la colonne garde son défaut (faux) et revient dans le RETURNING
    expect(sql).not.toMatch(/INSERT INTO notifications \([^)]*read/);
    expect(sql).toMatch(/RETURNING[\s\S]*read/);
    expect(params).toEqual([
      UUID.student,
      'lesson_scheduled',
      'Leçon planifiée',
      'Votre leçon Parc est fixée au 15/10/2026 10:00.',
      { screen: 'MyLessons', id: 'lesson-1' },
    ]);
  });

  it('insert : une notification sans destination s’écrit avec `null`', async () => {
    const { pool, query } = fakePool([{ id: 'n2' }]);

    await new NotificationRepository(pool).insert({
      userId: UUID.student,
      type: NotificationType.LESSON_REMINDER,
      title: 'Leçon demain',
      message: 'Rappel : leçon Parc demain à 10:00.',
      data: null,
    });

    expect((query.mock.calls[0] as [string, unknown[]])[1][4]).toBeNull();
  });

  it('findByUser : récentes d’abord, bornées, filtre des non lues porté par la requête', async () => {
    const { pool, query } = fakePool([{ id: 'n1' }]);

    await new NotificationRepository(pool).findByUser(UUID.student, true, 50);

    const [sql, params] = query.mock.calls[0] as [string, unknown[]];
    expect(sql).toMatch(/WHERE user_id = \$1 AND \(\$2::boolean = FALSE OR read = FALSE\)/);
    expect(sql).toMatch(/ORDER BY created_at DESC\s+LIMIT \$3/);
    expect(params).toEqual([UUID.student, true, 50]);
  });

  it('markRead : le compte fait partie du filtre ; rien trouvé → false', async () => {
    const found = fakePool([{ id: 'n1' }]);
    await expect(new NotificationRepository(found.pool).markRead(UUID.student, 'n1')).resolves.toBe(
      true
    );
    const [sql, params] = found.query.mock.calls[0] as [string, unknown[]];
    expect(sql).toMatch(/WHERE id = \$1 AND user_id = \$2/);
    expect(params).toEqual(['n1', UUID.student]);

    await expect(
      new NotificationRepository(fakePool([]).pool).markRead(UUID.student, 'n-autre')
    ).resolves.toBe(false);
  });

  it('markAllRead : seules les non lues du compte, et leur nombre', async () => {
    const { pool, query } = fakePool([]);
    query.mockResolvedValue({ rows: [], rowCount: 4 });

    await expect(new NotificationRepository(pool).markAllRead(UUID.student)).resolves.toBe(4);
    const [sql] = query.mock.calls[0] as [string, unknown[]];
    expect(sql).toMatch(/WHERE user_id = \$1 AND read = FALSE/);

    query.mockResolvedValue({ rows: [], rowCount: null });
    await expect(new NotificationRepository(pool).markAllRead(UUID.student)).resolves.toBe(0);
  });
});
