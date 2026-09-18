import Joi from 'joi';

export type Validated<T> = { ok: true; value: T } | { ok: false; detail: string };

/**
 * Validation Joi typée : `value` est du type du schéma quand `ok` est vrai, sinon `detail`
 * porte le message du premier champ fautif (à passer à `sendValidationError`).
 */
export function validate<T>(schema: Joi.ObjectSchema<T>, input: unknown): Validated<T> {
  const result = schema.validate(input);
  if (result.error) {
    return { ok: false, detail: result.error.details[0].message };
  }
  return { ok: true, value: result.value };
}
