import { Response } from 'express';
import { sendCaughtError, sendValidationError } from '../../../http/errors';
import { validate } from '../../../http/validation';
import { AuthRequest, getAuthUser } from '../../../middleware/auth.middleware';
import { AvailabilityService } from '../services/availability.service';
import { replaceAvailabilitySchema } from '../validators/availability.validator';

/** I1 / I2 du contrat : la semaine type de l'instructeur connecté (15.6). */
export class AvailabilityController {
  constructor(private readonly availabilityService: AvailabilityService) {}

  /** I1 */
  getMine = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      res.json(await this.availabilityService.getMine(getAuthUser(req)));
    } catch (err) {
      sendCaughtError(res, err);
    }
  };

  /** I2 */
  replaceMine = async (req: AuthRequest, res: Response): Promise<void> => {
    const parsed = validate(replaceAvailabilitySchema, req.body);
    if (!parsed.ok) {
      sendValidationError(res, parsed.detail);
      return;
    }
    try {
      res.json(await this.availabilityService.replaceMine(getAuthUser(req), parsed.value));
    } catch (err) {
      sendCaughtError(res, err);
    }
  };
}
