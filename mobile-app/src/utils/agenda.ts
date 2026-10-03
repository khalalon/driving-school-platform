/**
 * Logique de l'agenda instructeur (15.3, D-59), sans React : semaine affichée (lundi → lundi
 * suivant, en heure locale), plage envoyée à L9 et leçons rangées par jour.
 */

import type { Lesson } from '../models/Lesson';
import { toLocalDateKey } from './format';

/** Lundi 00:00 (heure locale) de la semaine qui contient `date`. */
export const startOfWeek = (date: Date): Date => {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  // getDay : 0 = dimanche ; la semaine commence le lundi
  const offset = (start.getDay() + 6) % 7;
  start.setDate(start.getDate() - offset);
  return start;
};

export const addDays = (date: Date, days: number): Date => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

/** Plage de L9 pour la semaine qui commence à `weekStart` : [lundi, lundi suivant[ en ISO. */
export const weekRange = (weekStart: Date): { from: string; to: string } => ({
  from: weekStart.toISOString(),
  to: addDays(weekStart, 7).toISOString(),
});

export interface AgendaDay {
  /** Minuit local du jour. */
  date: Date;
  /** `YYYY-MM-DD` local : clé de liste et comparaison avec aujourd'hui. */
  key: string;
  lessons: Lesson[];
}

/** Les sept jours de la semaine, chacun avec ses leçons triées par heure (même vides). */
export const groupByDay = (lessons: Lesson[], weekStart: Date): AgendaDay[] => {
  const days: AgendaDay[] = Array.from({ length: 7 }, (_, index) => {
    const date = addDays(weekStart, index);
    return { date, key: toLocalDateKey(date), lessons: [] };
  });
  const byKey = new Map(days.map((day) => [day.key, day]));
  for (const lesson of lessons) {
    if (!lesson.scheduledDate) continue;
    byKey.get(toLocalDateKey(new Date(lesson.scheduledDate)))?.lessons.push(lesson);
  }
  for (const day of days) {
    day.lessons.sort(
      (a, b) => new Date(a.scheduledDate ?? 0).getTime() - new Date(b.scheduledDate ?? 0).getTime()
    );
  }
  return days;
};

/** Fin d'une leçon (ISO) : début + durée (60 min à défaut, comme le serveur). */
export const lessonEnd = (lesson: Lesson): string | null => {
  if (!lesson.scheduledDate) return null;
  const start = new Date(lesson.scheduledDate).getTime();
  return new Date(start + (lesson.durationMinutes ?? 60) * 60_000).toISOString();
};
