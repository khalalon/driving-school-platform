/**
 * Notifications — §7 du contrat (N1 à N5, D-63 à D-66). Le texte arrive **déjà rendu** par le
 * serveur dans la langue de l'appareil (D-47) : l'app n'a ni catalogue ni traduction à faire,
 * seulement à afficher et à ouvrir la bonne destination. Dates en chaînes ISO 8601.
 */

export type PushPlatform = 'android' | 'ios';

/** Destination portée par le push **et** par l'historique (migration 019) : même écran. */
export interface NotificationTarget {
  screen: string;
  id?: string;
}

/** N3 : une ligne d'historique. `type` sert aux icônes ; le texte est dans `title` / `message`. */
export interface AppNotification {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  data: NotificationTarget | null;
  createdAt: string;
}

/** N1 : enregistrement d'un appareil (rejoué à la connexion et à chaque changement de langue). */
export interface RegisterPushTokenData {
  token: string;
  platform: PushPlatform;
  language: 'fr' | 'ar';
}

/** N3 renvoie au plus 50 lignes : au-delà, le badge affiche « 50+ ». */
export const NOTIFICATION_PAGE = 50;

/** Texte du badge : rien à zéro, « 50+ » quand la page est pleine (D-66). */
export const unreadBadge = (count: number): string | null => {
  if (count <= 0) return null;
  return count >= NOTIFICATION_PAGE ? `${NOTIFICATION_PAGE}+` : String(count);
};
