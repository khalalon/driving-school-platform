/**
 * ThemeContext (D-48) : le thème suit le réglage du téléphone (`useColorScheme`), sans sélecteur
 * dans l'application. Les écrans lisent `useTheme()` ; aucune couleur n'est écrite en dur.
 */

import React, { createContext, useContext, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { Theme, themes } from '../theme';

const ThemeContext = createContext<Theme | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const scheme = useColorScheme();
  const theme = useMemo(() => themes[scheme === 'dark' ? 'dark' : 'light'], [scheme]);

  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
};

/** Thème courant. Hors `ThemeProvider` (tests unitaires), le thème clair est renvoyé. */
export const useTheme = (): Theme => useContext(ThemeContext) ?? themes.light;
