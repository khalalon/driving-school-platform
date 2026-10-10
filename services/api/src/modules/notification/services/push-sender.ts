import { PushMessage } from '../types/notification.types';

/**
 * Envoi des messages push. Deux implémentations (D-63, `NOTIFICATIONS_DRIVER`) :
 * `LogPushSender` par défaut — rien ne sort de la machine, ce qui laisse le développement et
 * les tests de bout en bout parler du **contenu** des messages ; `ExpoPushSender` en production.
 */
export interface IPushSender {
  /**
   * Envoie les messages et renvoie les jetons que le service de push déclare **morts**
   * (appareil désinstallé, jeton révoqué) : l'appelant les retire de `push_tokens`.
   */
  send(messages: PushMessage[]): Promise<{ invalidTokens: string[] }>;
}

/** Journalise au lieu d'envoyer. Aucun jeton n'est jamais déclaré mort. */
export class LogPushSender implements IPushSender {
  constructor(private readonly log: (message: string) => void = console.info) {}

  send(messages: PushMessage[]): Promise<{ invalidTokens: string[] }> {
    for (const message of messages) {
      this.log(
        `[push:log] ${message.tokens.length} appareil(s) — ${message.title} : ${message.body} ` +
          `(${JSON.stringify(message.data)})`
      );
    }
    return Promise.resolve({ invalidTokens: [] });
  }
}
