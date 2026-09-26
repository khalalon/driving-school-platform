import { HttpError } from '../../../http/errors';
import { SchoolGuard } from '../../../http/authz';
import { AuthUser } from '../../../types/auth';
import { LessonType } from '../../../types/domain';
import { IPricingRepository } from '../repositories/pricing.repository';
import { Pricing, SetPricingDTO } from '../types/school.types';

/**
 * La grille tarifaire appartient à l'école : son instructeur la tient à jour depuis
 * l'application (D-51), l'admin passe partout (D-20). La lecture reste publique (S4).
 */
export class PricingService {
  constructor(
    private readonly pricingRepository: IPricingRepository,
    private readonly schoolGuard: SchoolGuard
  ) {}

  /** Upsert (école × type) ; les bornes (> 0) sont garanties par le validateur Joi. */
  async setPricing(caller: AuthUser, schoolId: string, dto: SetPricingDTO): Promise<Pricing> {
    await this.schoolGuard.assertSameSchool(caller, schoolId);
    return this.pricingRepository.setPricing(schoolId, dto);
  }

  getPricingBySchool(schoolId: string): Promise<Pricing[]> {
    return this.pricingRepository.findBySchoolId(schoolId);
  }

  /** Tarif d'un type pour une école, ou null s'il n'y en a pas (D-30 : prix saisi à la main sinon). */
  getPricingByType(schoolId: string, lessonType: LessonType): Promise<Pricing | null> {
    return this.pricingRepository.findBySchoolAndType(schoolId, lessonType);
  }

  /** Le tarif dit à quelle école il appartient : c'est elle qui décide (403 sinon). */
  async deletePricing(caller: AuthUser, id: string): Promise<void> {
    const pricing = await this.pricingRepository.findById(id);
    if (!pricing) {
      throw new HttpError(404, 'NOT_FOUND', 'Tarif introuvable');
    }
    await this.schoolGuard.assertSameSchool(caller, pricing.schoolId);
    await this.pricingRepository.delete(id);
  }
}
