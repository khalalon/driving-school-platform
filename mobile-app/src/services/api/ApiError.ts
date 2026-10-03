/**
 * Erreurs du backend (D-27) : `{ error: <code stable>, message: <texte français> }`.
 *
 * Tous les `catch` des écrans passent par ici. Depuis 10.5 (D-47) le texte affiché vient du
 * **code stable** traduit dans la langue courante : un élève en arabe ne doit pas lire une
 * phrase française. Un code absent du catalogue retombe sur le `message` du serveur, puis sur
 * le texte de secours de l'écran (réseau injoignable, réponse inattendue).
 */

import { AxiosError } from 'axios';
import { TranslationKey, t } from '../../i18n';
import type { ScheduleConflict } from '../../models/Lesson';

export interface ApiErrorBody {
  error?: string;
  message?: string;
  /** 409 SCHEDULE_CONFLICT (15.2) : la leçon qui occupe déjà le créneau. */
  conflict?: ScheduleConflict;
}

const bodyOf = (error: unknown): ApiErrorBody | undefined => {
  const data: unknown = (error as AxiosError<ApiErrorBody> | undefined)?.response?.data;
  return data && typeof data === 'object' ? (data as ApiErrorBody) : undefined;
};

/** Code stable renvoyé par le backend (`CANCEL_WINDOW_CLOSED`, `NOT_ENROLLED`…), s'il y en a un. */
export const getApiErrorCode = (error: unknown): string | undefined => bodyOf(error)?.error;

/** La leçon en conflit d'un 409 `SCHEDULE_CONFLICT` (L4, L5 — D-58), sinon `undefined`. */
export const getScheduleConflict = (error: unknown): ScheduleConflict | undefined => {
  const body = bodyOf(error);
  return body?.error === 'SCHEDULE_CONFLICT' && body.conflict ? body.conflict : undefined;
};

/**
 * Codes du contrat (§1–8) et leur clé de traduction. Un code qui n'est pas dans le contrat n'est
 * pas inventé ici : il retombera sur le message du serveur.
 */
const ERROR_KEYS: Record<string, TranslationKey> = {
  VALIDATION_ERROR: 'error.VALIDATION_ERROR',
  UNAUTHORIZED: 'error.UNAUTHORIZED',
  FORBIDDEN: 'error.FORBIDDEN',
  FORBIDDEN_SCHOOL: 'error.FORBIDDEN_SCHOOL',
  FORBIDDEN_MANAGER: 'error.FORBIDDEN_MANAGER',
  NOT_FOUND: 'error.NOT_FOUND',
  CONFLICT: 'error.CONFLICT',
  NOT_ENROLLED: 'error.NOT_ENROLLED',
  CANCEL_WINDOW_CLOSED: 'error.CANCEL_WINDOW_CLOSED',
  PRICE_REQUIRED: 'error.PRICE_REQUIRED',
  INVALID_SCHOOL_CODE: 'error.INVALID_SCHOOL_CODE',
  SCHEDULE_CONFLICT: 'error.SCHEDULE_CONFLICT',
  INTERNAL_ERROR: 'error.INTERNAL_ERROR',
};

/** Traduction d'un code d'erreur du contrat, `undefined` si le code est inconnu. */
export const translateApiErrorCode = (code: string | undefined): string | undefined => {
  const key = code ? ERROR_KEYS[code] : undefined;
  return key ? t(key) : undefined;
};

/** Texte à afficher à l'utilisateur, dans sa langue quand le code est connu (D-47). */
export const getApiErrorMessage = (error: unknown, fallback: string): string => {
  const body = bodyOf(error);
  return translateApiErrorCode(body?.error) ?? body?.message ?? body?.error ?? fallback;
};
