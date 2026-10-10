/**
 * Vocabulaire métier inséré dans les messages (D-47) : type de leçon, type d'examen, résultat.
 * Ces mots **se traduisent**, contrairement à un nom ou à une date — sans quoi un message arabe
 * dirait « Votre examen practical ».
 *
 * Ce sont **exactement** les libellés du mobile (`mobile-app/src/i18n/{fr,ar}.ts`, clés
 * `lesson.type.*`, `exam.type.*`, `exam.result.*`) : un élève ne doit pas lire « Conduite » dans
 * l'application et « practical » dans la notification. À garder en phase avec eux.
 */

import { MessageParam } from '../types/notification.types';

/** Horodatage de l'école (Africa/Tunis, D-08) en numérique : lisible dans les deux langues. */
const SCHOOL_TIME_ZONE = 'Africa/Tunis';

const LESSON_TYPES: Record<string, MessageParam> = {
  CODE: { fr: 'Code', ar: 'قانون السير' },
  Manœuvre: { fr: 'Manœuvre', ar: 'المناورات' },
  Parc: { fr: 'Parc', ar: 'الحلبة' },
};

const EXAM_TYPES: Record<string, MessageParam> = {
  theory: { fr: 'Code', ar: 'قانون السير' },
  practical: { fr: 'Conduite', ar: 'السياقة' },
};

const EXAM_RESULTS: Record<string, MessageParam> = {
  passed: { fr: 'Réussi', ar: 'ناجح' },
  failed: { fr: 'Ajourné', ar: 'راسب' },
  pending: { fr: 'En attente', ar: 'في الانتظار' },
};

/** Valeur inconnue : on renvoie la valeur brute plutôt que de perdre l'information. */
const term = (table: Record<string, MessageParam>, value: string): MessageParam =>
  table[value] ?? value;

export const lessonTypeTerm = (type: string): MessageParam => term(LESSON_TYPES, type);
export const examTypeTerm = (type: string): MessageParam => term(EXAM_TYPES, type);
export const examResultTerm = (result: string): MessageParam => term(EXAM_RESULTS, result);

/**
 * Date et heure de l'école, en numérique (`15/10/2026 10:00`). Volontairement sans nom de mois :
 * le même texte sert les deux langues, et l'heure est celle de l'école, pas celle du serveur.
 */
export const schoolDateTime = (date: Date | string | null): string => {
  if (!date) {
    return '';
  }
  const value = typeof date === 'string' ? new Date(date) : date;
  return value
    .toLocaleString('fr-FR', {
      timeZone: SCHOOL_TIME_ZONE,
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
    .replace(',', '');
};

/** Heure seule, pour le rappel de la veille (17.5) : `10:00`. */
export const schoolTime = (date: Date | string | null): string => {
  if (!date) {
    return '';
  }
  const value = typeof date === 'string' ? new Date(date) : date;
  return value.toLocaleString('fr-FR', {
    timeZone: SCHOOL_TIME_ZONE,
    hour: '2-digit',
    minute: '2-digit',
  });
};
