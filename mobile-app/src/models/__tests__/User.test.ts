/**
 * `toIsoDay` (12.3, D-50) : A2 attend un jour `YYYY-MM-DD`. Passer par `toISOString()` aurait
 * decale la date d'un jour pour toute heure locale proche de minuit — d'ou ce formatage local.
 */
import { toIsoDay } from '../User';

describe('toIsoDay (D-50)', () => {
  it('formate le jour local, pas le jour UTC', () => {
    // 1er janvier 2001 a 00h30 heure locale : en UTC+1 ce serait encore le 31 decembre
    expect(toIsoDay(new Date(2001, 0, 1, 0, 30))).toBe('2001-01-01');
  });

  it('complete le mois et le jour a deux chiffres', () => {
    expect(toIsoDay(new Date(2001, 2, 9, 12, 0))).toBe('2001-03-09');
    expect(toIsoDay(new Date(1999, 11, 31, 23, 59))).toBe('1999-12-31');
  });
});
