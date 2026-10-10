import { INotificationRepository } from '../../repositories/notification.repository';
import { IPushTokenRepository } from '../../repositories/push-token.repository';
import { NotificationType, PushToken } from '../../types/notification.types';
import { NotificationDispatcher } from '../notification-dispatcher';
import { IPushSender } from '../push-sender';

const token = (
  userId: string,
  value: string,
  language: 'fr' | 'ar',
  updatedAt = new Date('2026-10-10T10:00:00Z')
): PushToken => ({
  id: `id-${value}`,
  userId,
  token: value,
  platform: 'android',
  language,
  updatedAt,
});

/**
 * Le répartiteur écrit l'historique (D-66) **et** envoie le push (D-63), sans jamais faire
 * échouer l'appelant : c'est la règle qui compte le plus ici, l'action métier a déjà réussi.
 */
describe('NotificationDispatcher (17.3)', () => {
  let pushTokens: jest.Mocked<IPushTokenRepository>;
  let history: jest.Mocked<INotificationRepository>;
  let sender: jest.Mocked<IPushSender>;
  let warnings: string[];
  let dispatcher: NotificationDispatcher;

  const payload = {
    type: NotificationType.LESSON_SCHEDULED,
    params: { type: 'Parc', date: '15 octobre' },
    target: { screen: 'MyLessons', id: 'lesson-1' },
  };

  beforeEach(() => {
    pushTokens = {
      upsert: jest.fn(),
      remove: jest.fn(),
      findByUsers: jest.fn().mockResolvedValue([]),
      removeByToken: jest.fn().mockResolvedValue(undefined),
    };
    history = { insert: jest.fn().mockResolvedValue(undefined) };
    sender = { send: jest.fn().mockResolvedValue({ invalidTokens: [] }) };
    warnings = [];
    dispatcher = new NotificationDispatcher(pushTokens, history, sender, (line) =>
      warnings.push(line)
    );
  });

  it('une langue par appareil : un seul rendu par langue, les jetons groupés derrière', async () => {
    pushTokens.findByUsers.mockResolvedValue([
      token('u1', 'fr-1', 'fr'),
      token('u2', 'ar-1', 'ar'),
      token('u2', 'fr-2', 'fr'),
    ]);

    await dispatcher.notify(['u1', 'u2'], payload);

    expect(sender.send).toHaveBeenCalledTimes(1);
    const messages = sender.send.mock.calls[0][0];
    expect(messages).toHaveLength(2);

    const francais = messages.find((message) => message.tokens.includes('fr-1'));
    expect(francais?.tokens).toEqual(['fr-1', 'fr-2']);
    expect(francais?.body).toBe('Votre leçon Parc est fixée au 15 octobre.');
    expect(francais?.data).toEqual({ screen: 'MyLessons', id: 'lesson-1' });

    const arabe = messages.find((message) => message.tokens.includes('ar-1'));
    expect(arabe?.tokens).toEqual(['ar-1']);
    expect(arabe?.body).not.toBe(francais?.body);
  });

  it('historique : une ligne par destinataire, dans la langue de son appareil le plus récent', async () => {
    pushTokens.findByUsers.mockResolvedValue([
      token('u2', 'ar-recent', 'ar', new Date('2026-10-10T12:00:00Z')),
      token('u2', 'fr-ancien', 'fr', new Date('2026-01-01T12:00:00Z')),
    ]);

    await dispatcher.notify(['u1', 'u2'], payload);

    expect(history.insert).toHaveBeenCalledTimes(2);
    const [sansAppareil, avecAppareil] = history.insert.mock.calls.map((call) => call[0]);

    // u1 n'a aucun appareil : la ligne existe quand même, en français (D-47 par défaut)
    expect(sansAppareil).toMatchObject({
      userId: 'u1',
      type: NotificationType.LESSON_SCHEDULED,
      title: 'Leçon planifiée',
      data: { screen: 'MyLessons', id: 'lesson-1' },
    });
    expect(avecAppareil.userId).toBe('u2');
    expect(avecAppareil.title).not.toBe('Leçon planifiée');
  });

  it('les jetons morts sont retirés après l’envoi', async () => {
    pushTokens.findByUsers.mockResolvedValue([token('u1', 'mort', 'fr')]);
    sender.send.mockResolvedValue({ invalidTokens: ['mort'] });

    await dispatcher.notify(['u1'], payload);

    expect(pushTokens.removeByToken).toHaveBeenCalledWith('mort');
  });

  it('un envoi en échec ne remonte pas : l’action métier reste réussie (D-63)', async () => {
    pushTokens.findByUsers.mockResolvedValue([token('u1', 't1', 'fr')]);
    sender.send.mockRejectedValue(new Error('Expo injoignable'));

    await expect(dispatcher.notify(['u1'], payload)).resolves.toBeUndefined();
    expect(warnings.join(' ')).toContain('Expo injoignable');
  });

  it('une écriture d’historique en échec ne remonte pas non plus', async () => {
    history.insert.mockRejectedValue(new Error('base indisponible'));

    await expect(dispatcher.notify(['u1'], payload)).resolves.toBeUndefined();
    expect(warnings.join(' ')).toContain('base indisponible');
  });

  it('aucun destinataire : ni historique, ni envoi ; les doublons sont écartés', async () => {
    await dispatcher.notify([], payload);
    expect(history.insert).not.toHaveBeenCalled();
    expect(sender.send).not.toHaveBeenCalled();

    await dispatcher.notify(['u1', 'u1'], payload);
    expect(pushTokens.findByUsers).toHaveBeenLastCalledWith(['u1']);
    expect(history.insert).toHaveBeenCalledTimes(1);
  });

  it('aucun appareil enregistré : l’historique est écrit, aucun push n’est tenté', async () => {
    await dispatcher.notify(['u1'], payload);

    expect(history.insert).toHaveBeenCalledTimes(1);
    expect(sender.send).not.toHaveBeenCalled();
  });
});
