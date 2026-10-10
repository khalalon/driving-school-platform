import { NotificationType } from '../../types/notification.types';
import { renderMessage } from '../messages';
import { examResultTerm, examTypeTerm, lessonTypeTerm, schoolDateTime, schoolTime } from '../terms';

/**
 * Vocabulaire et horodatage insérés dans les messages. Les dates sont celles de **l'école**
 * (Africa/Tunis, D-08) : un serveur en UTC ne doit pas annoncer une leçon une heure trop tôt.
 */
describe('vocabulaire et dates des messages (17.4)', () => {
  it('les termes métier donnent leur couple français / arabe', () => {
    expect(lessonTypeTerm('Manœuvre')).toEqual({ fr: 'Manœuvre', ar: 'المناورات' });
    expect(examTypeTerm('practical')).toEqual({ fr: 'Conduite', ar: 'السياقة' });
    expect(examResultTerm('failed')).toEqual({ fr: 'Ajourné', ar: 'راسب' });
    expect(examResultTerm('pending')).toEqual({ fr: 'En attente', ar: 'في الانتظار' });
  });

  it('une valeur inconnue est rendue telle quelle, l’information n’est pas perdue', () => {
    expect(lessonTypeTerm('Circuit')).toBe('Circuit');
    expect(examTypeTerm('simulateur')).toBe('simulateur');
    expect(examResultTerm('inconnu')).toBe('inconnu');
  });

  it('date et heure en heure de l’école, pas celle du serveur', () => {
    // 09:00 UTC = 10:00 à Tunis (UTC+1 toute l'année)
    const utc = new Date('2026-10-15T09:00:00Z');
    expect(schoolDateTime(utc)).toBe('15/10/2026 10:00');
    expect(schoolTime(utc)).toBe('10:00');
    // Une chaîne ISO est acceptée telle quelle (ce que renvoient les dépôts via pg)
    expect(schoolDateTime('2026-10-15T09:00:00Z')).toBe('15/10/2026 10:00');
    expect(schoolTime('2026-10-15T09:00:00Z')).toBe('10:00');
  });

  it('une date absente ne rend rien, plutôt qu’« Invalid Date »', () => {
    expect(schoolDateTime(null)).toBe('');
    expect(schoolTime(null)).toBe('');
  });

  it('un message sans valeur se rend quand même (gabarit sans trou visible)', () => {
    const rendu = renderMessage(NotificationType.ENROLLMENT_APPROVED, 'fr');
    expect(rendu.title).toBe('Inscription acceptée');
    expect(rendu.body).not.toContain('{{');
  });
});
