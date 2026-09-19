/**
 * Erreurs du backend (D-27) : `{ error: <code stable>, message: <texte français> }`.
 * Tous les `catch` des écrans passent par ici : on affiche `message`, avec repli sur `error`,
 * puis sur le texte de secours propre à l'écran (réseau injoignable, réponse inattendue).
 */

import { AxiosError } from 'axios';

export interface ApiErrorBody {
  error?: string;
  message?: string;
}

const bodyOf = (error: unknown): ApiErrorBody | undefined => {
  const data: unknown = (error as AxiosError<ApiErrorBody> | undefined)?.response?.data;
  return data && typeof data === 'object' ? (data as ApiErrorBody) : undefined;
};

/** Code stable renvoyé par le backend (`CANCEL_WINDOW_CLOSED`, `NOT_ENROLLED`…), s'il y en a un. */
export const getApiErrorCode = (error: unknown): string | undefined => bodyOf(error)?.error;

/** Texte à afficher à l'utilisateur. */
export const getApiErrorMessage = (error: unknown, fallback: string): string => {
  const body = bodyOf(error);
  return body?.message ?? body?.error ?? fallback;
};
