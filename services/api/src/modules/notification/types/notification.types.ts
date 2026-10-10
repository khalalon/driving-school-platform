/**
 * Notifications (D-63 à D-66). D-35 ne vaut plus : les événements de D-63 partent en push et
 * sont conservés dans `notifications` (001) pour l'historique de D-66.
 *
 * Un **jeton push** identifie un appareil, pas un compte (migration 018) : il est unique et
 * change de `userId` quand le téléphone change de main. Sa `language` est celle choisie dans
 * l'application sur cet appareil (D-47), pas celle du compte.
 */

export type PushPlatform = 'android' | 'ios';
export const PUSH_PLATFORMS: readonly PushPlatform[] = ['android', 'ios'];

/** Langues de l'application (D-47) ; le catalogue de messages du serveur suit les mêmes. */
export type NotificationLanguage = 'fr' | 'ar';
export const NOTIFICATION_LANGUAGES: readonly NotificationLanguage[] = ['fr', 'ar'];

export interface PushToken {
  id: string;
  userId: string;
  token: string;
  platform: PushPlatform;
  language: NotificationLanguage;
  updatedAt: Date;
}

/** N1 : enregistrement d'un appareil, rejoué à chaque connexion et changement de langue. */
export interface RegisterPushTokenDTO {
  token: string;
  platform: PushPlatform;
  language: NotificationLanguage;
}

/** N2 : retrait d'un appareil, au logout. */
export interface RemovePushTokenDTO {
  token: string;
}
