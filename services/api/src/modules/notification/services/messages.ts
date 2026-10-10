/**
 * Catalogue des messages de notification (D-63), **côté serveur** : c'est lui qui connaît la
 * langue de l'appareil destinataire (D-47, `push_tokens.language`), le mobile ne reçoit qu'un
 * texte déjà rendu. Les deux langues sont obligatoires pour chaque événement : un message
 * manquant en arabe serait un message en français sur un téléphone arabophone.
 *
 * Les valeurs sont insérées telles quelles (`{{date}}`, `{{student}}`…) : elles arrivent déjà
 * mises en forme par l'appelant, qui seul sait comment écrire une date ou un montant.
 */

import {
  MessageParam,
  MessageParams,
  NotificationLanguage,
  NotificationType,
  RenderedMessage,
} from '../types/notification.types';

type Catalogue = Record<NotificationType, Record<NotificationLanguage, RenderedMessage>>;

const CATALOGUE: Catalogue = {
  // --- Côté élève ---
  [NotificationType.ENROLLMENT_APPROVED]: {
    fr: { title: 'Inscription acceptée', body: '{{school}} a accepté votre inscription.' },
    ar: { title: 'تم قبول التسجيل', body: 'قبلت {{school}} تسجيلك.' },
  },
  [NotificationType.ENROLLMENT_REJECTED]: {
    fr: {
      title: 'Inscription refusée',
      body: '{{school}} a refusé votre inscription : {{reason}}',
    },
    ar: { title: 'تم رفض التسجيل', body: 'رفضت {{school}} تسجيلك: {{reason}}' },
  },
  [NotificationType.LESSON_SCHEDULED]: {
    fr: { title: 'Leçon planifiée', body: 'Votre leçon {{type}} est fixée au {{date}}.' },
    ar: { title: 'تم تحديد الحصة', body: 'حصتك {{type}} محدّدة في {{date}}.' },
  },
  [NotificationType.LESSON_REJECTED]: {
    fr: {
      title: 'Demande de leçon refusée',
      body: 'Votre demande de leçon {{type}} a été refusée : {{reason}}',
    },
    ar: { title: 'تم رفض طلب الحصة', body: 'رُفض طلب حصتك {{type}}: {{reason}}' },
  },
  [NotificationType.LESSON_CANCELLED_BY_SCHOOL]: {
    fr: {
      title: 'Leçon annulée',
      body: 'Votre leçon du {{date}} a été annulée par l’école : {{reason}}',
    },
    ar: { title: 'تم إلغاء الحصة', body: 'أُلغيت حصتك في {{date}} من قبل المدرسة: {{reason}}' },
  },
  [NotificationType.LESSON_REMINDER]: {
    fr: { title: 'Leçon demain', body: 'Rappel : leçon {{type}} demain à {{time}}.' },
    ar: { title: 'حصة غدًا', body: 'تذكير: حصة {{type}} غدًا في {{time}}.' },
  },
  [NotificationType.EXAM_SCHEDULED]: {
    fr: {
      title: 'Examen planifié',
      body: 'Votre examen {{type}} est fixé au {{date}} — {{location}}.',
    },
    ar: { title: 'تم تحديد الامتحان', body: 'امتحانك {{type}} محدّد في {{date}} — {{location}}.' },
  },
  [NotificationType.EXAM_REJECTED]: {
    fr: {
      title: 'Demande d’examen refusée',
      body: 'Votre demande d’examen {{type}} a été refusée : {{reason}}',
    },
    ar: { title: 'تم رفض طلب الامتحان', body: 'رُفض طلب امتحانك {{type}}: {{reason}}' },
  },
  [NotificationType.EXAM_RESULT]: {
    fr: { title: 'Résultat d’examen', body: 'Votre examen {{type}} : {{result}}.' },
    ar: { title: 'نتيجة الامتحان', body: 'امتحانك {{type}}: {{result}}.' },
  },
  // --- Côté école ---
  [NotificationType.ENROLLMENT_REQUESTED]: {
    fr: { title: 'Nouvelle inscription', body: '{{student}} demande à rejoindre votre école.' },
    ar: { title: 'تسجيل جديد', body: '{{student}} يطلب الانضمام إلى مدرستك.' },
  },
  [NotificationType.LESSON_REQUESTED]: {
    fr: {
      title: 'Nouvelle demande de leçon',
      body: '{{student}} demande une leçon {{type}} pour le {{date}}.',
    },
    ar: { title: 'طلب حصة جديد', body: '{{student}} يطلب حصة {{type}} في {{date}}.' },
  },
  [NotificationType.EXAM_REQUESTED]: {
    fr: {
      title: 'Nouvelle demande d’examen',
      body: '{{student}} demande un examen {{type}} pour le {{date}}.',
    },
    ar: { title: 'طلب امتحان جديد', body: '{{student}} يطلب امتحان {{type}} في {{date}}.' },
  },
  [NotificationType.LESSON_CANCELLED_BY_STUDENT]: {
    fr: { title: 'Leçon annulée par l’élève', body: '{{student}} a annulé sa leçon du {{date}}.' },
    ar: { title: 'ألغى التلميذ الحصة', body: 'ألغى {{student}} حصته في {{date}}.' },
  },
};

/** Une valeur traduisible donne le mot de la langue rendue ; une chaîne vaut pour les deux. */
const valueOf = (param: MessageParam, language: NotificationLanguage): string =>
  typeof param === 'string' ? param : param[language];

/** `{{clé}}` → valeur ; une valeur absente laisse une chaîne vide plutôt que le gabarit brut. */
const fill = (template: string, params: MessageParams, language: NotificationLanguage): string =>
  template.replace(/\{\{(\w+)\}\}/g, (_match, key: string) => {
    const param = params[key];
    return param === undefined ? '' : valueOf(param, language);
  });

export function renderMessage(
  type: NotificationType,
  language: NotificationLanguage,
  params: MessageParams = {}
): RenderedMessage {
  const entry = CATALOGUE[type][language];
  return {
    title: fill(entry.title, params, language),
    body: fill(entry.body, params, language),
  };
}

/** Exposé pour les tests : chaque événement doit avoir ses deux langues. */
export const messageCatalogue: Catalogue = CATALOGUE;
