/**
 * Formatage d'affichage : montants dans la devise de l'école (D-43), noms, jour local.
 */
import {
  formatAmount,
  formatCountdown,
  formatPersonName,
  initialsOf,
  toLocalDateKey,
} from '../format';
import { applyLanguage } from '../../i18n';

afterEach(() => applyLanguage('fr'));

describe('formatCountdown', () => {
  const now = new Date('2026-09-20T10:00:00.000Z');

  it('minutes, puis heures et minutes, puis jours', () => {
    expect(formatCountdown('2026-09-20T10:45:00.000Z', now)).toBe('dans 45 min');
    expect(formatCountdown('2026-09-20T12:05:00.000Z', now)).toBe('dans 2 h 05 min');
    expect(formatCountdown('2026-09-22T09:00:00.000Z', now)).toBe('dans 2 jours');
    expect(formatCountdown('2026-09-21T10:30:00.000Z', now)).toBe('dans 1 jour');
    expect(formatCountdown('2026-09-21T22:00:00.000Z', now)).toBe('dans 2 jours');
  });

  it('déjà commencé, ou date absente', () => {
    expect(formatCountdown('2026-09-20T09:00:00.000Z', now)).toBe('Commencée');
    expect(formatCountdown(null, now)).toBe('Date à définir');
  });

  it('en arabe, le compte à rebours et le repli sont traduits (D-47)', () => {
    applyLanguage('ar');
    expect(formatCountdown('2026-09-20T10:45:00.000Z', now)).toBe('بعد 45 دقيقة');
    expect(formatCountdown('2026-09-20T09:00:00.000Z', now)).toBe('انطلقت');
    expect(formatCountdown(null, now)).toBe('التاريخ لم يُحدَّد');
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

describe('initialsOf (13.5)', () => {
  it('prend la première lettre du prénom et du nom, en capitales', () => {
    expect(initialsOf('yasmine', 'amri')).toBe('YA');
    expect(initialsOf('Karim', null)).toBe('K');
    expect(initialsOf('  ', undefined)).toBe('?');
  });
});
