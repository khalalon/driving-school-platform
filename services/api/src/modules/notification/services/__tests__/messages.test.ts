import { NOTIFICATION_LANGUAGES, NOTIFICATION_TYPES } from '../../types/notification.types';
import { NotificationType } from '../../types/notification.types';
import { messageCatalogue, renderMessage } from '../messages';

/**
 * Le catalogue est la seule source des textes envoyés (D-63) : un événement sans traduction
 * arabe enverrait du français sur un téléphone arabophone (D-47). Le contrôle porte donc sur
 * la **couverture** autant que sur le rendu.
 */
describe('catalogue des messages (17.3, D-63, D-47)', () => {
  it('chaque événement a un titre et un corps non vides, en français et en arabe', () => {
    const manquants: string[] = [];

    for (const type of NOTIFICATION_TYPES) {
      for (const language of NOTIFICATION_LANGUAGES) {
        const entry = messageCatalogue[type]?.[language];
        if (!entry?.title.trim() || !entry?.body.trim()) {
          manquants.push(`${type}/${language}`);
        }
      }
    }

    expect(manquants).toEqual([]);
    expect(NOTIFICATION_TYPES).toHaveLength(13);
  });

  it('les valeurs sont insérées dans les deux langues', () => {
    expect(
      renderMessage(NotificationType.LESSON_SCHEDULED, 'fr', {
        type: 'Manœuvre',
        date: 'jeudi 15 octobre à 10:00',
      })
    ).toEqual({
      title: 'Leçon planifiée',
      body: 'Votre leçon Manœuvre est fixée au jeudi 15 octobre à 10:00.',
    });

    const arabe = renderMessage(NotificationType.LESSON_SCHEDULED, 'ar', {
      type: 'Manœuvre',
      date: '15 أكتوبر',
    });
    expect(arabe.body).toContain('15 أكتوبر');
    expect(arabe.title).not.toBe('Leçon planifiée');
  });

  it('une valeur absente laisse un trou vide, jamais le gabarit brut', () => {
    const rendu = renderMessage(NotificationType.ENROLLMENT_REJECTED, 'fr', {
      school: 'Auto-école El Amel',
    });
    expect(rendu.body).toBe('Auto-école El Amel a refusé votre inscription : ');
    expect(rendu.body).not.toContain('{{');
  });
});
