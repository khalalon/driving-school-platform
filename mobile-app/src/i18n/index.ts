/**
 * i18n — français et arabe (D-47).
 *
 * Volontairement sans bibliothèque : un catalogue par langue (`fr.ts`, `ar.ts`), une langue
 * courante au niveau du module (pour que `models/` et `utils/format.ts` traduisent sans être des
 * composants) et un abonnement pour que React se redessine au changement. Le choix est mémorisé
 * sur l'appareil ; au premier lancement il suit la langue du téléphone (arabe → arabe, tout le
 * reste → français, D-47).
 */

import { I18nManager } from 'react-native';
import * as Localization from 'expo-localization';
import { storageService } from '../services/storage/StorageService';
import { TranslationKey, fr } from './fr';
import { ar } from './ar';

export type Language = 'fr' | 'ar';

export const LANGUAGES: readonly { code: Language; labelKey: TranslationKey; rtl: boolean }[] = [
  { code: 'fr', labelKey: 'language.french', rtl: false },
  { code: 'ar', labelKey: 'language.arabic', rtl: true },
];

const CATALOGUES: Record<Language, Record<TranslationKey, string>> = { fr, ar };

/** Clé de stockage du choix de l'utilisateur (appareil, pas serveur — D-47). */
export const LANGUAGE_STORAGE_KEY = '@driving_school/language';

const DEFAULT_LANGUAGE: Language = 'fr';

let current: Language = DEFAULT_LANGUAGE;
const listeners = new Set<(language: Language) => void>();

/** Langue du téléphone ramenée à une langue connue : `ar*` → arabe, tout le reste → français. */
export const deviceLanguage = (): Language => {
  const tag = Localization.getLocales()[0]?.languageCode ?? '';
  return tag.toLowerCase().startsWith('ar') ? 'ar' : DEFAULT_LANGUAGE;
};

export const getLanguage = (): Language => current;

export const isRTL = (language: Language = current): boolean =>
  LANGUAGES.find((l) => l.code === language)?.rtl ?? false;

/** S'abonne aux changements de langue ; renvoie la fonction de désabonnement. */
export const onLanguageChange = (listener: (language: Language) => void): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

const isLanguage = (value: string | null): value is Language =>
  value === 'fr' || value === 'ar';

/**
 * Traduit une clé. `{param}` est remplacé par la valeur fournie ; une clé inconnue est renvoyée
 * telle quelle (visible en développement, jamais un écran vide en production).
 */
export const t = (key: TranslationKey, params?: Record<string, string | number>): string => {
  const catalogue = CATALOGUES[current] ?? fr;
  const template = catalogue[key] ?? fr[key] ?? key;
  if (!params) return template;
  return Object.keys(params).reduce(
    (text, name) => text.split(`{${name}}`).join(String(params[name])),
    template
  );
};

/** Applique la langue en mémoire et prévient les abonnés (sans toucher au stockage ni au RTL). */
export const applyLanguage = (language: Language): void => {
  current = language;
  listeners.forEach((listener) => listener(language));
};

/**
 * Langue au démarrage : celle mémorisée sur l'appareil, sinon celle du téléphone (D-47).
 * Aligne aussi le sens de lecture pour que le premier rendu soit déjà dans le bon sens.
 */
export const initLanguage = async (): Promise<Language> => {
  let stored: string | null = null;
  try {
    stored = await storageService.getItem(LANGUAGE_STORAGE_KEY);
  } catch {
    // Stockage indisponible : on retombe sur la langue du téléphone
  }
  const language = isLanguage(stored) ? stored : deviceLanguage();
  applyLanguage(language);
  syncLayoutDirection(language);
  return language;
};

/** Aligne `I18nManager` sur la langue ; `true` si le sens de lecture a changé. */
export const syncLayoutDirection = (language: Language): boolean => {
  const wanted = isRTL(language);
  if (I18nManager.isRTL === wanted) return false;
  I18nManager.allowRTL(wanted);
  I18nManager.forceRTL(wanted);
  return true;
};

/**
 * Change la langue : mémorise le choix, prévient les écrans, et signale si l'application doit
 * redémarrer (passage RTL ↔ LTR : React Native ne bascule le sens qu'au démarrage).
 */
export const setLanguage = async (language: Language): Promise<{ needsRestart: boolean }> => {
  try {
    await storageService.setItem(LANGUAGE_STORAGE_KEY, language);
  } catch {
    // Le choix ne survivra pas à la fermeture, mais la session en cours est déjà traduite
  }
  applyLanguage(language);
  return { needsRestart: syncLayoutDirection(language) };
};

export type { TranslationKey };
