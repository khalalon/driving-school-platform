import { LessonType } from '../../../types/domain';
import { IPricingRepository } from '../repositories/pricing.repository';
import { Pricing, SetPricingDTO } from '../types/school.types';

export class PricingService {
  constructor(private readonly pricingRepository: IPricingRepository) {}

  /** Upsert (école × type) ; les bornes (> 0) sont garanties par le validateur Joi. */
  setPricing(schoolId: string, dto: SetPricingDTO): Promise<Pricing> {
    return this.pricingRepository.setPricing(schoolId, dto);
  }

  getPricingBySchool(schoolId: string): Promise<Pricing[]> {
    return this.pricingRepository.findBySchoolId(schoolId);
  }

  /** Tarif d'un type pour une école, ou null s'il n'y en a pas (D-30 : prix saisi à la main sinon). */
  getPricingByType(schoolId: string, lessonType: LessonType): Promise<Pricing | null> {
    return this.pricingRepository.findBySchoolAndType(schoolId, lessonType);
  }

  deletePricing(id: string): Promise<void> {
    return this.pricingRepository.delete(id);
  }
}
