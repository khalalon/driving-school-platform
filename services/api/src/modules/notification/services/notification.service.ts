import { HttpError } from '../../../http/errors';
import { AuthUser } from '../../../types/auth';
import { INotificationRepository } from '../repositories/notification.repository';
import { IPushTokenRepository } from '../repositories/push-token.repository';
import { PushToken, RegisterPushTokenDTO, StoredNotification } from '../types/notification.types';

/** N3 : l'écran montre les 50 dernières (D-66) ; au-delà, l'historique ne sert plus à rien. */
export const NOTIFICATION_PAGE = 50;

/**
 * Jetons push (N1, N2 — D-63). Tout utilisateur connecté enregistre l'appareil qu'il a dans la
 * main : aucun cloisonnement par école ici, un jeton n'appartient qu'à son porteur. Le retrait
 * est volontairement silencieux (pas de 404) : au logout, l'appareil n'a pas à savoir si le
 * serveur avait encore son jeton.
 */
export class NotificationService {
  constructor(
    private readonly pushTokens: IPushTokenRepository,
    /** Historique (D-66, 17.6) : chacun ne voit et ne marque que les siennes. */
    private readonly history: INotificationRepository
  ) {}

  registerPushToken(caller: AuthUser, dto: RegisterPushTokenDTO): Promise<PushToken> {
    return this.pushTokens.upsert(caller.userId, dto);
  }

  removePushToken(caller: AuthUser, token: string): Promise<void> {
    return this.pushTokens.remove(caller.userId, token);
  }

  /** N3 : les 50 dernières notifications de l'appelant, ou ses seules non lues. */
  listMine(caller: AuthUser, unreadOnly: boolean): Promise<StoredNotification[]> {
    return this.history.findByUser(caller.userId, unreadOnly, NOTIFICATION_PAGE);
  }

  /** N4 : 404 aussi pour la notification d'un autre compte — un 403 dirait qu'elle existe. */
  async markRead(caller: AuthUser, id: string): Promise<void> {
    if (!(await this.history.markRead(caller.userId, id))) {
      throw new HttpError(404, 'NOT_FOUND', 'Notification introuvable');
    }
  }

  /** N5 : rejouable, sans effet s'il n'y a plus rien à lire. */
  async markAllRead(caller: AuthUser): Promise<void> {
    await this.history.markAllRead(caller.userId);
  }
}
