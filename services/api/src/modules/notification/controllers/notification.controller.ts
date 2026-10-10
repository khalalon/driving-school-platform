import { Response } from 'express';
import { sendCaughtError, sendValidationError } from '../../../http/errors';
import { validate } from '../../../http/validation';
import { AuthRequest, getAuthUser } from '../../../middleware/auth.middleware';
import { NotificationService } from '../services/notification.service';
import {
  registerPushTokenSchema,
  removePushTokenSchema,
} from '../validators/notification.validator';

/** N1 / N2 : l'appareil s'enregistre à la connexion et se retire au logout (D-63). */
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  /** N1 */
  registerPushToken = async (req: AuthRequest, res: Response): Promise<void> => {
    const parsed = validate(registerPushTokenSchema, req.body);
    if (!parsed.ok) {
      sendValidationError(res, parsed.detail);
      return;
    }
    try {
      res.json(await this.notificationService.registerPushToken(getAuthUser(req), parsed.value));
    } catch (err) {
      sendCaughtError(res, err);
    }
  };

  /** N2 : 204 même si le jeton n'était plus là. */
  removePushToken = async (req: AuthRequest, res: Response): Promise<void> => {
    const parsed = validate(removePushTokenSchema, req.body);
    if (!parsed.ok) {
      sendValidationError(res, parsed.detail);
      return;
    }
    try {
      await this.notificationService.removePushToken(getAuthUser(req), parsed.value.token);
      res.status(204).send();
    } catch (err) {
      sendCaughtError(res, err);
    }
  };
}
