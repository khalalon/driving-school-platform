import { INotificationRepository } from '../repositories/notification.repository';
import { IPushTokenRepository } from '../repositories/push-token.repository';
import {
  NotificationLanguage,
  NotificationPayload,
  Notifier,
  PushMessage,
  PushToken,
} from '../types/notification.types';
import { renderMessage } from './messages';
import { IPushSender } from './push-sender';

/** Langue d'un destinataire sans appareil enregistré : le français (D-47, langue par défaut). */
const FALLBACK_LANGUAGE: NotificationLanguage = 'fr';

/**
 * Répartiteur des notifications (D-63, D-66) : il écrit l'historique **et** envoie le push.
 *
 * Trois choix à retenir :
 * - **rien ne remonte** : `notify` n'échoue jamais, l'action métier qui vient de réussir ne
 *   doit pas être annulée parce qu'un push est tombé (D-63). Les erreurs sont journalisées ;
 * - **une langue par appareil** (D-47) : le texte est rendu une fois par langue présente chez
 *   les destinataires, et les jetons sont groupés derrière. Deux téléphones d'un même élève,
 *   l'un en arabe l'autre en français, reçoivent chacun le bon texte ;
 * - **l'historique est écrit même sans appareil** : un élève qui n'a jamais ouvert l'app sur un
 *   téléphone enregistré retrouve quand même le message dans son écran « Notifications ».
 *   Sa langue est celle de son appareil le plus récent, à défaut le français.
 */
export class NotificationDispatcher implements Notifier {
  constructor(
    private readonly pushTokens: IPushTokenRepository,
    private readonly history: INotificationRepository,
    private readonly sender: IPushSender,
    private readonly log: (message: string) => void = console.warn
  ) {}

  async notify(userIds: string[], payload: NotificationPayload): Promise<void> {
    const recipients = [...new Set(userIds)];
    if (recipients.length === 0) {
      return;
    }

    try {
      const tokens = await this.pushTokens.findByUsers(recipients);
      await this.writeHistory(recipients, tokens, payload);
      await this.push(tokens, payload);
    } catch (error) {
      // Dernier filet : une notification perdue ne doit jamais renvoyer une erreur à l'appelant.
      this.log(`[notification] ${payload.type} non envoyée : ${String(error)}`);
    }
  }

  private async writeHistory(
    recipients: string[],
    tokens: PushToken[],
    payload: NotificationPayload
  ): Promise<void> {
    // `findByUsers` trie par `updated_at` décroissant : le premier jeton d'un compte est le plus récent.
    const languageOf = new Map<string, NotificationLanguage>();
    for (const token of tokens) {
      if (!languageOf.has(token.userId)) {
        languageOf.set(token.userId, token.language);
      }
    }

    for (const userId of recipients) {
      const language = languageOf.get(userId) ?? FALLBACK_LANGUAGE;
      const { title, body } = renderMessage(payload.type, language, payload.params);
      await this.history.insert({
        userId,
        type: payload.type,
        title,
        message: body,
        data: payload.target ?? null,
      });
    }
  }

  private async push(tokens: PushToken[], payload: NotificationPayload): Promise<void> {
    if (tokens.length === 0) {
      return;
    }

    const byLanguage = new Map<NotificationLanguage, string[]>();
    for (const token of tokens) {
      const bucket = byLanguage.get(token.language);
      if (bucket) {
        bucket.push(token.token);
      } else {
        byLanguage.set(token.language, [token.token]);
      }
    }

    const messages: PushMessage[] = [...byLanguage.entries()].map(([language, tokenList]) => {
      const { title, body } = renderMessage(payload.type, language, payload.params);
      return {
        tokens: tokenList,
        title,
        body,
        data: payload.target ?? { screen: 'Notifications' },
      };
    });

    const { invalidTokens } = await this.sender.send(messages);
    for (const token of invalidTokens) {
      await this.pushTokens.removeByToken(token);
    }
  }
}
