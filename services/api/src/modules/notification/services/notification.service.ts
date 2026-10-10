import { AuthUser } from '../../../types/auth';
import { IPushTokenRepository } from '../repositories/push-token.repository';
import { PushToken, RegisterPushTokenDTO } from '../types/notification.types';

/**
 * Jetons push (N1, N2 — D-63). Tout utilisateur connecté enregistre l'appareil qu'il a dans la
 * main : aucun cloisonnement par école ici, un jeton n'appartient qu'à son porteur. Le retrait
 * est volontairement silencieux (pas de 404) : au logout, l'appareil n'a pas à savoir si le
 * serveur avait encore son jeton.
 */
export class NotificationService {
  constructor(private readonly pushTokens: IPushTokenRepository) {}

  registerPushToken(caller: AuthUser, dto: RegisterPushTokenDTO): Promise<PushToken> {
    return this.pushTokens.upsert(caller.userId, dto);
  }

  removePushToken(caller: AuthUser, token: string): Promise<void> {
    return this.pushTokens.remove(caller.userId, token);
  }
}
