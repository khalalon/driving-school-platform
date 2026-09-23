/**
 * LanguageContext — la langue choisie (D-47) au-dessus de la navigation.
 *
 * Le catalogue vit dans `src/i18n` (utilisable hors composant) ; ce contexte ne sert qu'à
 * redessiner les écrans quand la langue change et à exposer `t` / `setLanguage` aux écrans.
 */

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { Alert, I18nManager } from 'react-native';
import * as Updates from 'expo-updates';
import {
  Language,
  TranslationKey,
  getLanguage,
  initLanguage,
  isRTL,
  onLanguageChange,
  setLanguage as persistLanguage,
  t as translate,
} from '../i18n';

interface LanguageContextValue {
  language: Language;
  isRTL: boolean;
  /** `true` tant que la langue mémorisée n'est pas lue (premier rendu). */
  isLoading: boolean;
  t: (key: TranslationKey, params?: Record<string, string | number>) => string;
  /** Mémorise la langue ; redémarre l'app si le sens de lecture change (RTL ↔ LTR). */
  setLanguage: (language: Language) => Promise<void>;
}

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

export const LanguageProvider = ({ children }: { children: React.ReactNode }) => {
  const [language, setLanguageState] = useState<Language>(getLanguage());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onLanguageChange(setLanguageState);
    initLanguage()
      .then((current) => {
        // Le sens de lecture n'est relu qu'au démarrage du moteur natif : si l'application a
        // seulement rechargé son JavaScript, la mise en page est encore dans l'ancien sens.
        if (I18nManager.isRTL !== isRTL(current)) {
          Alert.alert(translate('language.restartTitle'), translate('language.restartText'));
        }
      })
      .finally(() => setIsLoading(false));
    return unsubscribe;
  }, []);

  const change = useCallback(async (next: Language) => {
    const { needsRestart } = await persistLanguage(next);
    if (!needsRestart) return;
    try {
      // RTL ↔ LTR n'est pris en compte qu'au démarrage : on relance l'application
      await Updates.reloadAsync();
    } catch {
      // Redémarrage impossible (rare) : l'écran est traduit, le sens s'appliquera au prochain lancement
    }
  }, []);

  // `language` dans les dépendances : les écrans se redessinent à chaque changement
  const value: LanguageContextValue = {
    language,
    isRTL: isRTL(language),
    isLoading,
    t: (key, params) => translate(key, params),
    setLanguage: change,
  };

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

export const useI18n = (): LanguageContextValue => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useI18n doit être utilisé dans un LanguageProvider');
  }
  return context;
};
