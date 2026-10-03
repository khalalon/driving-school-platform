import Joi, { CustomHelpers } from 'joi';
import { LESSON_TYPES } from '../../../types/domain';
import {
  AvailabilitySlot,
  FreeSlotsQuery,
  ReplaceAvailabilityDTO,
} from '../types/availability.types';

/** `HH:MM` sur 24 h. */
const clock = Joi.string().pattern(/^([01]\d|2[0-3]):[0-5]\d$/, 'heure HH:MM');

const slotSchema = Joi.object<AvailabilitySlot>({
  weekday: Joi.number().integer().min(0).max(6).required(),
  startTime: clock.required(),
  endTime: clock.required(),
});

/** Nombre maximal de plages d'une semaine type : de quoi couper chaque jour en plusieurs. */
export const MAX_AVAILABILITY_SLOTS = 50;

/**
 * PUT `/api/instructors/me/availability` (15.6) : chaque plage finit après son début, et les
 * plages d'un même jour ne se chevauchent pas (se toucher est permis : 09:00–12:00 puis
 * 12:00–14:00). Une liste vide efface la semaine type.
 */
export const replaceAvailabilitySchema = Joi.object<ReplaceAvailabilityDTO>({
  slots: Joi.array()
    .items(slotSchema)
    .max(MAX_AVAILABILITY_SLOTS)
    .required()
    .custom((slots: AvailabilitySlot[], helpers: CustomHelpers) => {
      const backwards = slots.find((slot) => slot.endTime <= slot.startTime);
      if (backwards) {
        return helpers.message({
          custom: `une plage doit finir après son début (reçu ${backwards.startTime}–${backwards.endTime})`,
        }) as never;
      }
      // `HH:MM` se compare comme du texte : tri et chevauchements sans conversion
      const sorted = [...slots].sort(
        (a, b) => a.weekday - b.weekday || a.startTime.localeCompare(b.startTime)
      );
      for (let i = 1; i < sorted.length; i += 1) {
        const previous = sorted[i - 1];
        const current = sorted[i];
        if (current.weekday === previous.weekday && current.startTime < previous.endTime) {
          return helpers.message({
            custom: `deux plages du même jour se chevauchent (${previous.startTime}–${previous.endTime} et ${current.startTime}–${current.endTime})`,
          }) as never;
        }
      }
      return sorted;
    }, 'plages sans chevauchement'),
});

/** Plage maximale des créneaux libres (L10) : deux semaines. */
export const FREE_SLOTS_MAX_DAYS = 14;

/** L10 (15.7) : type de leçon, `from` < `to`, plage ≤ 14 jours. */
export const freeSlotsQuerySchema = Joi.object<FreeSlotsQuery>({
  type: Joi.string()
    .valid(...LESSON_TYPES)
    .required(),
  from: Joi.date().iso().required(),
  to: Joi.date().iso().greater(Joi.ref('from')).required(),
}).custom((value: FreeSlotsQuery, helpers: CustomHelpers) => {
  const days = (value.to.getTime() - value.from.getTime()) / 86_400_000;
  if (days > FREE_SLOTS_MAX_DAYS) {
    return helpers.message({
      custom: `La plage des créneaux ne peut pas dépasser ${FREE_SLOTS_MAX_DAYS} jours`,
    }) as never;
  }
  return value;
}, 'plage des créneaux');
