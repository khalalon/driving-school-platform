/**
 * Style d'un rôle typographique dans la langue courante (13.2, D-52). Suit les changements de
 * langue sans dépendre du `LanguageProvider` : les composants partagés restent utilisables
 * dans les tests de rendu qui ne montent pas le fournisseur.
 */

import { useMemo, useSyncExternalStore } from 'react';
import type { TextStyle } from 'react-native';
import { getLanguage, onLanguageChange } from '../i18n';
import { TextRole, textStyle } from './typography';

const subscribe = (onChange: () => void) => onLanguageChange(() => onChange());

export const useTextStyle = (role: TextRole): TextStyle => {
  const language = useSyncExternalStore(subscribe, getLanguage, getLanguage);
  return useMemo(() => textStyle(role, language), [role, language]);
};
