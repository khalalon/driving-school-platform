/**
 * Thème (D-48) : jetons sémantiques déclinés en clair et en sombre.
 *
 * Les écrans n'importent jamais une couleur : ils lisent `useTheme()` (`src/context/ThemeContext`)
 * et utilisent `theme.colors.surface`, `theme.colors.textPrimary`… Les anciennes constantes
 * (`colors`, `shadows`) restent exportées le temps de la refonte des écrans (11.3, 11.4).
 */

import {
  ColorTokens,
  ShadowTokens,
  ThemeName,
  MIN_TOUCH_TARGET,
  radius,
  spacing,
  typography,
} from './tokens';
import { lightColors, lightShadows } from './light';
import { darkColors, darkShadows } from './dark';

export type Shadows = ShadowTokens;

export interface Theme {
  name: ThemeName;
  colors: ColorTokens;
  shadows: Shadows;
  spacing: typeof spacing;
  radius: typeof radius;
  typography: typeof typography;
}

export const lightTheme: Theme = {
  name: 'light',
  colors: lightColors,
  shadows: lightShadows,
  spacing,
  radius,
  typography,
};

export const darkTheme: Theme = {
  name: 'dark',
  colors: darkColors,
  shadows: darkShadows,
  spacing,
  radius,
  typography,
};

export const themes: Record<ThemeName, Theme> = { light: lightTheme, dark: darkTheme };

export { spacing, radius, typography, MIN_TOUCH_TARGET };
export type { ColorTokens, ThemeName };
export { palette } from './tokens';

// --- Compatibilité : écrans pas encore refondus (supprimé à la fin de 11.4) ---
export * from './colors';
export * from './shadows';
