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
