import Joi from 'joi';
import {
  NOTIFICATION_LANGUAGES,
  PUSH_PLATFORMS,
  RegisterPushTokenDTO,
  RemovePushTokenDTO,
} from '../types/notification.types';

/**
 * Jeton Expo : `ExponentPushToken[…]` aujourd'hui, mais la forme appartient à Expo — on ne
 * valide donc qu'une longueur raisonnable, pas un motif qui casserait au prochain format.
 */
const token = Joi.string().trim().min(10).max(255);

export const registerPushTokenSchema = Joi.object<RegisterPushTokenDTO>({
  token: token.required(),
  platform: Joi.string()
    .valid(...PUSH_PLATFORMS)
    .required(),
  language: Joi.string()
    .valid(...NOTIFICATION_LANGUAGES)
    .required(),
});

export const removePushTokenSchema = Joi.object<RemovePushTokenDTO>({
  token: token.required(),
});
