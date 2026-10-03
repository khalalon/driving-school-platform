import { HttpError } from '../../../http/errors';
import { AuthUser } from '../../../types/auth';
import { IAvailabilityRepository } from '../repositories/availability.repository';
import { AvailabilitySlot, ReplaceAvailabilityDTO } from '../types/availability.types';
import { InstructorLookup } from './lesson.service';

/**
 * Semaine type de disponibilités (15.6, D-60) : chaque instructeur lit et remplace **la sienne**
 * (route `me`) ; les créneaux libres proposés aux élèves en découlent (15.7).
 */
export class AvailabilityService {
  constructor(
    private readonly availability: IAvailabilityRepository,
    private readonly instructors: InstructorLookup
  ) {}

  async getMine(caller: AuthUser): Promise<AvailabilitySlot[]> {
    return this.availability.findByInstructor(await this.requireInstructorId(caller));
  }

  /** Les plages sont déjà triées et sans chevauchement (validateur Joi). */
  async replaceMine(caller: AuthUser, dto: ReplaceAvailabilityDTO): Promise<AvailabilitySlot[]> {
    return this.availability.replace(await this.requireInstructorId(caller), dto.slots);
  }

  private async requireInstructorId(caller: AuthUser): Promise<string> {
    const instructor = await this.instructors.findByUserId(caller.userId);
    if (!instructor) {
      throw new HttpError(
        403,
        'FORBIDDEN_SCHOOL',
        'Aucune école rattachée à ce compte instructeur'
      );
    }
    return instructor.id;
  }
}
