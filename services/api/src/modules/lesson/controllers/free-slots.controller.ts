import { Response } from 'express';
import { sendCaughtError, sendValidationError } from '../../../http/errors';
import { validate } from '../../../http/validation';
import { AuthRequest, getAuthUser } from '../../../middleware/auth.middleware';
import { FreeSlotsService } from '../services/free-slots.service';
import { freeSlotsQuerySchema } from '../validators/availability.validator';

/** L10 du contrat (15.7). */
export class FreeSlotsController {
  constructor(private readonly freeSlotsService: FreeSlotsService) {}

  getFreeSlots = async (req: AuthRequest, res: Response): Promise<void> => {
    const parsed = validate(freeSlotsQuerySchema, req.query);
    if (!parsed.ok) {
      sendValidationError(res, parsed.detail);
      return;
    }
    try {
      res.json(await this.freeSlotsService.getFreeSlots(getAuthUser(req), parsed.value));
    } catch (err) {
      sendCaughtError(res, err);
    }
  };
}
