import { fakePool } from '../../../../test-utils/http';
import { ReminderRepository } from '../reminder.repository';

/**
 * Réservation des rappels (17.5, D-65) : sélection **et** marquage dans une seule instruction —
 * c'est elle, plus que le verrou, qui garantit qu'aucune leçon n'est rappelée deux fois.
 */
describe('ReminderRepository', () => {
  it('claimDue : un seul UPDATE … RETURNING, jour comparé en heure de l’école', async () => {
    const row = { lessonId: 'l1', studentUserId: 'u1', type: 'Parc', scheduledDate: new Date() };
    const { pool, query } = fakePool([row]);
    const sentAt = new Date('2026-10-14T17:00:00Z');

    await expect(new ReminderRepository(pool).claimDue('2026-10-15', sentAt)).resolves.toEqual([
      row,
    ]);

    expect(query).toHaveBeenCalledTimes(1);
    const [sql, params] = query.mock.calls[0] as [string, unknown[]];
    expect(sql).toMatch(/^\s*UPDATE lessons l\s+SET reminder_sent_at = \$2/);
    expect(sql).toMatch(/l\.status = 'scheduled'/);
    expect(sql).toMatch(/l\.reminder_sent_at IS NULL/);
    expect(sql).toMatch(/AT TIME ZONE 'UTC'\) AT TIME ZONE 'Africa\/Tunis'\)::date = \$1::date/);
    expect(sql).toMatch(/RETURNING l\.id AS "lessonId", s\.user_id AS "studentUserId"/);
    expect(params).toEqual(['2026-10-15', sentAt]);
  });
});
