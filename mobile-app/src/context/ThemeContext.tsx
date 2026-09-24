/**
 * ThemeContext (D-48) : le thème suit le réglage du téléphone (`useColorScheme`), sans sélecteur
 * dans l'application. Les écrans lisent `useTheme()` ; aucune couleur n'est écrite en dur.
 */

import React, { createContext, useContext, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { Theme, ThemeName, themes } from '../theme';

const ThemeContext = createContext<Theme | undefined>(undefined);

interface ThemeProviderProps {
  children: React.ReactNode;
  /** Force un thème au lieu du réglage du téléphone. Sert aux tests de rendu (11.2). */
  name?: ThemeName;
}

export const ThemeProvider = ({ children, name }: ThemeProviderProps) => {
  const scheme = useColorScheme();
  const theme = useMemo(
    () => themes[name ?? (scheme === 'dark' ? 'dark' : 'light')],
    [name, scheme]
  );

  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
};

/** Thème courant. Hors `ThemeProvider` (tests unitaires), le thème clair est renvoyé. */
export const useTheme = (): Theme => useContext(ThemeContext) ?? themes.light;
