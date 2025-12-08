import { Request, Response } from 'express';
import { PricingService } from '../services/pricing.service';
import { setPricingSchema } from '../validators/school.validator';

export class PricingController {
  constructor(private readonly pricingService: PricingService) {}

  setPricing = async (req: Request, res: Response) => {
    const { error, value } = setPricingSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.message });

    try {
      const pricing = await this.pricingService.setPricing(req.params.schoolId, value);
      res.status(201).json(pricing);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  };

  getPricingBySchool = async (req: Request, res: Response) => {
    try {
      const pricing = await this.pricingService.getPricingBySchool(req.params.schoolId);
      res.json(pricing);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  };

  deletePricing = async (req: Request, res: Response) => {
    try {
      await this.pricingService.deletePricing(req.params.id);
      res.status(204).send();
    } catch (err: any) {
      res.status(404).json({ error: err.message });
    }
  };
}
