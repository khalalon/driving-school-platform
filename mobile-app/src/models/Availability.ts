/**
 * Disponibilités des instructeurs (§6b du contrat, D-60) : la semaine type, en plages par jour.
 * `weekday` : 0 = dimanche … 6 = samedi (comme `Date.getDay`). Heures `HH:MM` de l'école.
 */
export interface AvailabilitySlot {
  weekday: number;
  startTime: string;
  endTime: string;
}

/** Ordre d'affichage de la semaine : du lundi au dimanche. */
export const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0] as const;

/** `HH:MM` sur 24 h, comme le serveur l'exige (I2). */
export const CLOCK_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Pourquoi une semaine type serait refusée par I2 ; `null` si elle est valide. */
export type AvailabilityProblem =
  | { kind: 'format'; slot: AvailabilitySlot }
  | { kind: 'backwards'; slot: AvailabilitySlot }
  | { kind: 'overlap'; first: AvailabilitySlot; second: AvailabilitySlot };

/** Plages triées par jour (ordre du contrat) puis heure de début. */
export const sortSlots = (slots: AvailabilitySlot[]): AvailabilitySlot[] =>
  [...slots].sort((a, b) => a.weekday - b.weekday || a.startTime.localeCompare(b.startTime));

/**
 * Mêmes règles que le serveur (I2) : format `HH:MM`, fin après le début, pas de chevauchement
 * entre deux plages du même jour (se toucher est permis). Contrôlé avant l'envoi.
 */
export const findAvailabilityProblem = (slots: AvailabilitySlot[]): AvailabilityProblem | null => {
  for (const slot of slots) {
    if (!CLOCK_PATTERN.test(slot.startTime) || !CLOCK_PATTERN.test(slot.endTime)) {
      return { kind: 'format', slot };
    }
    if (slot.endTime <= slot.startTime) return { kind: 'backwards', slot };
  }
  const sorted = sortSlots(slots);
  for (let i = 1; i < sorted.length; i += 1) {
    const first = sorted[i - 1];
    const second = sorted[i];
    if (first.weekday === second.weekday && second.startTime < first.endTime) {
      return { kind: 'overlap', first, second };
    }
  }
  return null;
};
