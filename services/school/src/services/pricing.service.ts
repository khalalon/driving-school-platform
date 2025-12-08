import { IPricingRepository } from '../repositories/pricing.repository';
import { Pricing, SetPricingDTO, LessonType } from '../types';

export class PricingService {
  constructor(private readonly pricingRepository: IPricingRepository) {}

  async setPricing(schoolId: string, dto: SetPricingDTO): Promise<Pricing> {
    if (dto.price <= 0) throw new Error('Price must be greater than 0');
    if (dto.duration <= 0) throw new Error('Duration must be greater than 0');
    return this.pricingRepository.setPricing(schoolId, dto);
  }

  async getPricingBySchool(schoolId: string): Promise<Pricing[]> {
    return this.pricingRepository.findBySchoolId(schoolId);
  }

  async getPricingByType(schoolId: string, lessonType: LessonType): Promise<Pricing | null> {
    return this.pricingRepository.findBySchoolAndType(schoolId, lessonType);
  }

  async deletePricing(id: string): Promise<void> {
    await this.pricingRepository.delete(id);
  }
}
