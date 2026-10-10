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

/**
 * Événements notifiés (D-63), côté élève puis côté école. La valeur est stockée dans
 * `notifications.type` (001) et sert de clé au catalogue de messages : ne jamais la renommer
 * sans migration, l'historique déjà écrit la porte.
 */
export enum NotificationType {
  // Côté élève
  ENROLLMENT_APPROVED = 'enrollment_approved',
  ENROLLMENT_REJECTED = 'enrollment_rejected',
  LESSON_SCHEDULED = 'lesson_scheduled',
  LESSON_REJECTED = 'lesson_rejected',
  LESSON_CANCELLED_BY_SCHOOL = 'lesson_cancelled_by_school',
  LESSON_REMINDER = 'lesson_reminder',
  EXAM_SCHEDULED = 'exam_scheduled',
  EXAM_REJECTED = 'exam_rejected',
  EXAM_RESULT = 'exam_result',
  // Côté école
  ENROLLMENT_REQUESTED = 'enrollment_requested',
  LESSON_REQUESTED = 'lesson_requested',
  EXAM_REQUESTED = 'exam_requested',
  LESSON_CANCELLED_BY_STUDENT = 'lesson_cancelled_by_student',
}

export const NOTIFICATION_TYPES: readonly NotificationType[] = Object.values(NotificationType);

/** Écran que l'appui sur la notification ouvre, et objet visé (`data` du push et de l'historique). */
export interface NotificationTarget {
  screen: string;
  id?: string;
}

/**
 * Valeur insérée dans un message. Une **chaîne** vaut pour les deux langues (un nom, une date
 * numérique) ; un **couple fr / ar** pour le vocabulaire métier (type d'examen, résultat), qui
 * se traduit — sans quoi un message arabe dirait « Votre examen practical ».
 */
export type MessageParam = string | Record<NotificationLanguage, string>;
export type MessageParams = Record<string, MessageParam>;

/** Ce qu'un service métier demande d'envoyer : l'événement, ses valeurs, sa destination. */
export interface NotificationPayload {
  type: NotificationType;
  /** Valeurs insérées dans le message (`{{date}}`, `{{student}}`…), déjà mises en forme. */
  params?: MessageParams;
  target?: NotificationTarget;
}

/** Message rendu dans une langue (D-47). */
export interface RenderedMessage {
  title: string;
  body: string;
}

/** Un envoi push : plusieurs jetons, un seul texte (donc une seule langue). */
export interface PushMessage {
  tokens: string[];
  title: string;
  body: string;
  data: NotificationTarget;
}

/** Ligne d'historique (table `notifications`, 001 + colonne `data` en 019). */
export interface StoredNotification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  data: NotificationTarget | null;
  createdAt: Date;
}

/**
 * Ce que les services métier utilisent (17.4) : envoyer ne doit **jamais** faire échouer
 * l'action qui vient de réussir (D-63), donc aucune erreur ne remonte d'ici.
 */
export interface Notifier {
  notify(userIds: string[], payload: NotificationPayload): Promise<void>;
}

/**
 * Ce que les services métier reçoivent en 17.4 : les deux manières d'adresser une notification.
 * `notifySchool` applique D-64 — l'instructeur préféré s'il y en a un, sinon tous les
 * instructeurs de l'école — pour qu'aucun service n'ait à la réimplémenter.
 */
export interface SchoolNotifier extends Notifier {
  notifySchool(
    schoolId: string,
    payload: NotificationPayload,
    preferredInstructorId?: string | null
  ): Promise<void>;
}
