import Joi from 'joi';
import { HttpError } from './errors';

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

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Paramètre de chemin censé être un UUID : une valeur mal formée ne peut désigner aucune
 * ressource → 404 NOT_FOUND (plutôt qu'une erreur Postgres « invalid input syntax for type uuid »).
 */
export function uuidParam(value: string | undefined, label: string): string {
  if (!value || !UUID_PATTERN.test(value)) {
    throw new HttpError(404, 'NOT_FOUND', `${label} introuvable`);
  }
  return value;
}

/** Paramètre de requête facultatif restreint à une liste de valeurs ; 400 sinon. */
export function enumQuery<T extends string>(
  value: unknown,
  allowed: readonly T[],
  label: string
): T | undefined {
  if (value === undefined || value === '') return undefined;
  if (typeof value !== 'string' || !allowed.includes(value as T)) {
    throw new HttpError(
      400,
      'VALIDATION_ERROR',
      `Données invalides : ${label} doit valoir ${allowed.join(', ')}`
    );
  }
  return value as T;
}
