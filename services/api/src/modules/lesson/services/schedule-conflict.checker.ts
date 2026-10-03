import { Queryable } from '../../../db/transaction';
import { HttpError } from '../../../http/errors';
import { ScheduleConflict, ScheduleSlot } from '../types/lesson.types';

/**
 * Ce que le contrôle attend du stockage : poser les verrous de la transaction et trouver une
 * leçon `scheduled` qui chevauche le créneau (`LessonRepository`).
 */
export interface ScheduleConflictSource {
  /** Verrous transactionnels (`pg_advisory_xact_lock`), libérés au COMMIT / ROLLBACK. */
  lockSchedule(keys: string[], executor: Queryable): Promise<void>;
  findOverlap(slot: ScheduleSlot, executor: Queryable): Promise<ScheduleConflict | null>;
}

/**
 * Chevauchements à la planification (15.2, D-58) : une leçon `scheduled` du **même instructeur
 * ou du même élève** qui recouvre [début, début + durée[ → 409 `SCHEDULE_CONFLICT` avec la leçon
 * en conflit ; `force` passe outre (l'instructeur a vu l'avertissement).
 *
 * Appelé **dans la transaction** qui écrit la leçon, après avoir verrouillé l'instructeur et
 * l'élève : deux approbations simultanées sur le même créneau ne passent pas toutes les deux.
 * Réutilisable pour les véhicules (23.3) : il suffit d'une source qui connaît la ressource.
 */
export class ScheduleConflictChecker {
  constructor(private readonly source: ScheduleConflictSource) {}

  async assertFree(slot: ScheduleSlot, force: boolean, executor: Queryable): Promise<void> {
    // Toujours verrouiller, même forcé : une autre planification attend la fin de celle-ci
    await this.source.lockSchedule([slot.instructorId, slot.studentUserId], executor);
    if (force) {
      return;
    }
    const conflict = await this.source.findOverlap(slot, executor);
    if (conflict) {
      throw new HttpError(
        409,
        'SCHEDULE_CONFLICT',
        conflict.instructorId === slot.instructorId
          ? "L'instructeur a déjà une leçon sur ce créneau"
          : "L'élève a déjà une leçon sur ce créneau",
        { conflict }
      );
    }
  }
}
