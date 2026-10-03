import { LessonType } from '../../../types/domain';

/**
 * Disponibilités des instructeurs (15.6, D-60) : la semaine type, en plages par jour.
 * `weekday` : 0 = dimanche … 6 = samedi (JavaScript `getDay`, Postgres `EXTRACT(DOW)`).
 * Heures `HH:MM` de l'école (Africa/Tunis), sans fuseau.
 */
export interface AvailabilitySlot {
  weekday: number;
  startTime: string;
  endTime: string;
}

/** PUT `/api/instructors/me/availability` : la semaine type entière, remplacée d'un bloc. */
export interface ReplaceAvailabilityDTO {
  slots: AvailabilitySlot[];
}

/** L10 (15.7) : créneaux libres d'un type de leçon sur [from, to[ (≤ 14 jours). */
export interface FreeSlotsQuery {
  type: LessonType;
  from: Date;
  to: Date;
}

/** Ce que le dépôt calcule : l'école, la plage et la durée d'un créneau. */
export interface FreeSlotsFilter {
  schoolId: string;
  from: Date;
  to: Date;
  durationMinutes: number;
}

/** Un créneau libre (L10) : l'élève l'envoie tel quel en L2 (`requestedDate`, préférence). */
export interface FreeSlot {
  start: Date;
  end: Date;
  instructorId: string;
  instructorFirstName: string;
  instructorLastName: string;
}
