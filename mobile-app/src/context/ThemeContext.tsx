/**
 * ThemeContext (13.3, D-52) : **sombre au premier lancement**, puis le choix de l'utilisateur
 * (Sombre / Clair / Système) mémorisé sur le téléphone. « Système » suit le réglage du téléphone
 * (`useColorScheme`) — c'est pourquoi `app.json` garde `userInterfaceStyle: automatic`.
 *
 * Les écrans lisent `useTheme()` ; aucune couleur n'est écrite en dur. L'écran Réglages lit et
 * change le choix par `useThemePreference()`.
 */

import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';
import { Theme, ThemeName, themes } from '../theme';

export type ThemePreference = 'dark' | 'light' | 'system';

export const THEME_PREFERENCES: readonly ThemePreference[] = ['dark', 'light', 'system'];
export const THEME_STORAGE_KEY = '@driving_school/theme';
/** Premier lancement : l'identité « Circuit » est sombre (D-52). */
export const DEFAULT_THEME_PREFERENCE: ThemePreference = 'dark';

const isPreference = (value: string | null): value is ThemePreference =>
  value === 'dark' || value === 'light' || value === 'system';

/** Choix mémorisé, ou le défaut. Lu par App.tsx avant le premier écran (pas d'éclair clair). */
export const loadThemePreference = async (): Promise<ThemePreference> => {
  try {
    const stored = await AsyncStorage.getItem(THEME_STORAGE_KEY);
    return isPreference(stored) ? stored : DEFAULT_THEME_PREFERENCE;
  } catch {
    return DEFAULT_THEME_PREFERENCE;
  }
};

/** Thème affiché pour un choix donné et le réglage courant du téléphone. */
export const resolveThemeName = (
  preference: ThemePreference,
  scheme: string | null | undefined
): ThemeName => {
  if (preference === 'system') {
    return scheme === 'light' ? 'light' : 'dark';
  }
  return preference;
};

interface ThemePreferenceValue {
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => Promise<void>;
}

const ThemeContext = createContext<Theme | undefined>(undefined);
const ThemePreferenceContext = createContext<ThemePreferenceValue | undefined>(undefined);

interface ThemeProviderProps {
  children: React.ReactNode;
  /** Choix déjà lu au démarrage (`loadThemePreference`) ; sinon le défaut, sombre. */
  initialPreference?: ThemePreference;
  /** Force un thème, quel que soit le choix. Sert aux tests de rendu (11.2). */
  name?: ThemeName;
}

export const ThemeProvider = ({ children, initialPreference, name }: ThemeProviderProps) => {
  const scheme = useColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>(
    initialPreference ?? DEFAULT_THEME_PREFERENCE
  );

  const setPreference = useCallback(async (next: ThemePreference) => {
    setPreferenceState(next);
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Le choix vaut pour la session même s'il n'a pas pu être mémorisé
    }
  }, []);

  const theme = themes[name ?? resolveThemeName(preference, scheme)];
  const preferenceValue = useMemo(
    () => ({ preference, setPreference }),
    [preference, setPreference]
  );

  return (
    <ThemePreferenceContext.Provider value={preferenceValue}>
      <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>
    </ThemePreferenceContext.Provider>
  );
};

/** Thème courant. Hors `ThemeProvider` (tests unitaires), le thème sombre par défaut. */
export const useTheme = (): Theme => useContext(ThemeContext) ?? themes.dark;

/** Choix Sombre / Clair / Système, pour l'écran Réglages. */
export const useThemePreference = (): ThemePreferenceValue => {
  const context = useContext(ThemePreferenceContext);
  if (!context) {
    throw new Error('useThemePreference doit être utilisé dans un ThemeProvider');
  }
  return context;
};

/** Barre d'état lisible sur le thème affiché (et non sur celui du téléphone). */
export const ThemedStatusBar = () => {
  const theme = useTheme();
  return <StatusBar style={theme.name === 'dark' ? 'light' : 'dark'} />;
};
