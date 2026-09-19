/**
 * Devise d'une école (D-43) : lue une fois par S2 et gardée en mémoire pour la session. Les
 * montants d'une école (grille, leçons, examens, résumé financier) sont tous dans sa devise ;
 * le mobile n'a aucun symbole codé en dur.
 */

import { useEffect, useState } from 'react';
import { schoolService } from '../services/api/SchoolService';

const currencies = new Map<string, string>();
const inFlight = new Map<string, Promise<string>>();

/** Devise de l'école, mise en cache ; un seul appel S2 par école même en cas d'appels concurrents. */
export const getSchoolCurrency = (schoolId: string): Promise<string> => {
  const known = currencies.get(schoolId);
  if (known) return Promise.resolve(known);
  const pending = inFlight.get(schoolId);
  if (pending) return pending;

  const request = schoolService
    .getSchoolById(schoolId)
    .then((school) => {
      currencies.set(schoolId, school.currency);
      return school.currency;
    })
    .finally(() => {
      inFlight.delete(schoolId);
    });
  inFlight.set(schoolId, request);
  return request;
};

/** Vide le cache (tests). */
export const resetSchoolCurrencyCache = (): void => {
  currencies.clear();
  inFlight.clear();
};

/**
 * Devise de l'école pour les écrans : `null` tant qu'elle n'est pas connue (les montants
 * s'affichent alors sans devise), puis le code ISO 4217 (`TND`, `EUR`…).
 */
export const useSchoolCurrency = (schoolId: string | null | undefined): string | null => {
  const [currency, setCurrency] = useState<string | null>(
    schoolId ? (currencies.get(schoolId) ?? null) : null
  );

  useEffect(() => {
    if (!schoolId) {
      setCurrency(null);
      return;
    }
    let active = true;
    getSchoolCurrency(schoolId)
      .then((value) => {
        if (active) setCurrency(value);
      })
      .catch(() => {
        // École injoignable : les montants restent affichés sans devise
      });
    return () => {
      active = false;
    };
  }, [schoolId]);

  return currency;
};
