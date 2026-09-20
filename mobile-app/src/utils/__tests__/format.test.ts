/**
 * Formatage d'affichage : montants dans la devise de l'école (D-43), noms, jour local.
 */
import { formatAmount, formatCountdown, formatPersonName, toLocalDateKey } from '../format';

describe('formatCountdown', () => {
  const now = new Date('2026-09-20T10:00:00.000Z');

  it('minutes, puis heures et minutes, puis jours', () => {
    expect(formatCountdown('2026-09-20T10:45:00.000Z', now)).toBe('in 45 min');
    expect(formatCountdown('2026-09-20T12:05:00.000Z', now)).toBe('in 2 h 05 min');
    expect(formatCountdown('2026-09-22T09:00:00.000Z', now)).toBe('in 2 days');
    expect(formatCountdown('2026-09-21T10:30:00.000Z', now)).toBe('in 1 day');
  });

  it('déjà commencé, ou date absente', () => {
    expect(formatCountdown('2026-09-20T09:00:00.000Z', now)).toBe('Started');
    expect(formatCountdown(null, now)).toBe('Date TBD');
  });
});

describe('formatAmount (D-43)', () => {
  it('affiche deux décimales suivies du code ISO de la devise', () => {
    expect(formatAmount(40, 'TND')).toBe('40.00 TND');
    expect(formatAmount(12.5, 'EUR')).toBe('12.50 EUR');
  });

  it('sans devise connue (encore en chargement), le nombre seul', () => {
    expect(formatAmount(40, null)).toBe('40.00');
    expect(formatAmount(40, undefined)).toBe('40.00');
  });

  it('sans montant, un tiret', () => {
    expect(formatAmount(null, 'TND')).toBe('—');
    expect(formatAmount(undefined, 'TND')).toBe('—');
  });
});

describe('formatPersonName', () => {
  it('assemble prénom et nom, repli sinon', () => {
    expect(formatPersonName({ firstName: 'Lina', lastName: 'Test' })).toBe('Lina Test');
    expect(formatPersonName({ firstName: '', lastName: '' }, 'Student')).toBe('Student');
    expect(formatPersonName(null, 'Student')).toBe('Student');
  });
});

describe('toLocalDateKey', () => {
  it('rend le jour local YYYY-MM-DD sans passer par l’UTC', () => {
    expect(toLocalDateKey(new Date(2026, 8, 5, 23, 30))).toBe('2026-09-05');
  });
});
