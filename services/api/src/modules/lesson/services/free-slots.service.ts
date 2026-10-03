import { HttpError } from '../../../http/errors';
import { AuthUser } from '../../../types/auth';
import { IAvailabilityRepository } from '../repositories/availability.repository';
import { FreeSlot, FreeSlotsQuery } from '../types/availability.types';
import { PricingLookup, StudentLookup } from './lesson.service';

/** Durée d'un créneau quand l'école n'a pas de tarif pour le type (S4 `duration`). */
export const DEFAULT_SLOT_MINUTES = 60;

/**
 * Créneaux libres pour l'élève (15.7, D-60) : tirés des disponibilités des instructeurs de son
 * école, moins leurs leçons planifiées. **L2 ne change pas** : l'élève envoie
 * `requestedDate = start` et `preferredInstructorId = instructorId`, la demande reste `pending`
 * et l'école l'approuve (D-01).
 */
export class FreeSlotsService {
  constructor(
    private readonly students: StudentLookup,
    private readonly pricing: PricingLookup,
    private readonly availability: IAvailabilityRepository
  ) {}

  /** L10 : école résolue depuis l'inscription approuvée (D-22) ; 403 NOT_ENROLLED sinon. */
  async getFreeSlots(caller: AuthUser, query: FreeSlotsQuery): Promise<FreeSlot[]> {
    const student = await this.students.findByUserId(caller.userId);
    if (!student?.authorized) {
      throw new HttpError(
        403,
        'NOT_ENROLLED',
        'Vous devez être inscrit et approuvé dans une école pour voir ses créneaux'
      );
    }
    const rate = await this.pricing.getPricingByType(student.schoolId, query.type);
    return this.availability.findFreeSlots({
      schoolId: student.schoolId,
      from: query.from,
      to: query.to,
      durationMinutes: rate?.duration ?? DEFAULT_SLOT_MINUTES,
    });
  }
}
