import { PushMessage } from '../types/notification.types';
import { IPushSender } from './push-sender';

/** L'API push d'Expo accepte 100 messages par requête. */
export const EXPO_PUSH_CHUNK = 100;
const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

/** Ce qu'Expo renvoie, réduit à ce qui nous sert. */
interface ExpoTicket {
  status: 'ok' | 'error';
  details?: { error?: string };
}

interface ExpoResponse {
  data?: ExpoTicket[];
  errors?: { message?: string }[];
}

/**
 * Envoi par l'API push d'Expo (D-63). Un message par **jeton** : les billets reviennent dans
 * l'ordre des messages envoyés, et c'est le seul moyen de savoir quel appareil est mort.
 *
 * `DeviceNotRegistered` = application désinstallée ou jeton révoqué : le jeton est renvoyé à
 * l'appelant, qui le retire de `push_tokens` — sans quoi la table enfle et chaque envoi traîne
 * des appareils disparus. Les autres erreurs sont journalisées sans rien supprimer : un
 * `MessageRateExceeded` n'est pas un appareil perdu.
 *
 * Aucune dépendance ajoutée : `fetch` est natif sous Node 20.
 */
export class ExpoPushSender implements IPushSender {
  constructor(
    private readonly log: (message: string) => void = console.warn,
    private readonly fetchImpl: typeof fetch = fetch
  ) {}

  async send(messages: PushMessage[]): Promise<{ invalidTokens: string[] }> {
    // Un jeton = un message, pour pouvoir rattacher chaque billet à son appareil.
    const perToken = messages.flatMap((message) =>
      message.tokens.map((token) => ({
        to: token,
        title: message.title,
        body: message.body,
        data: message.data,
        sound: 'default' as const,
      }))
    );

    const invalidTokens: string[] = [];

    for (let start = 0; start < perToken.length; start += EXPO_PUSH_CHUNK) {
      const chunk = perToken.slice(start, start + EXPO_PUSH_CHUNK);
      let body: ExpoResponse;

      try {
        const response = await this.fetchImpl(EXPO_PUSH_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify(chunk),
        });
        if (!response.ok) {
          this.log(`[push:expo] HTTP ${response.status} pour ${chunk.length} message(s)`);
          continue;
        }
        body = (await response.json()) as ExpoResponse;
      } catch (error) {
        // Réseau coupé : on n'a rien appris sur les jetons, on ne supprime rien.
        this.log(`[push:expo] envoi impossible : ${String(error)}`);
        continue;
      }

      for (const error of body.errors ?? []) {
        this.log(`[push:expo] erreur Expo : ${error.message ?? 'inconnue'}`);
      }

      (body.data ?? []).forEach((ticket, index) => {
        if (ticket.status !== 'error') return;
        const reason = ticket.details?.error;
        const token = chunk[index]?.to;
        if (reason === 'DeviceNotRegistered' && token) {
          invalidTokens.push(token);
          return;
        }
        this.log(`[push:expo] billet en erreur (${reason ?? 'inconnue'})`);
      });
    }

    return { invalidTokens };
  }
}
