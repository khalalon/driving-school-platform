/**
 * Jetons de design (D-48). Les écrans ne connaissent que des noms **sémantiques** : ils
 * demandent `surface` ou `textPrimary`, jamais un bleu précis. Chaque jeton existe dans les deux
 * thèmes (`light.ts`, `dark.ts`) — un test refuse toute absence et tout contraste insuffisant.
 */

/** Palette brute : la seule liste de couleurs du projet. Personne d'autre ne l'importe. */
export const palette = {
  // Bleu profond « permis de conduire » : plus dense que le bleu par défaut de React Native
  blue50: '#EEF3FF',
  blue100: '#DCE6FF',
  blue200: '#B9CCFF',
  blue300: '#8FAcFF',
  blue400: '#5C82F5',
  blue500: '#2E5BE6',
  blue600: '#1E42C4',
  blue700: '#17339B',
  blue800: '#122778',
  blue900: '#0D1B54',

  // Sable : fond chaud des écrans, plus accueillant qu'un gris neutre
  sand50: '#FBFAF7',
  sand100: '#F4F1EA',
  sand200: '#E8E3D8',

  // Gris d'encre : textes et surfaces sombres
  ink50: '#F7F8FA',
  ink100: '#EDEFF3',
  ink200: '#DCE0E7',
  ink300: '#B9C0CC',
  ink400: '#8A93A3',
  ink500: '#5F697C',
  ink600: '#414A5C',
  ink700: '#2B3242',
  ink800: '#1B2130',
  ink900: '#11151F',

  green50: '#E8F7EF',
  green400: '#34B879',
  green500: '#1E9A5F',
  green600: '#15784A',

  amber50: '#FDF3E2',
  amber400: '#E9A13B',
  amber500: '#C97E15',
  amber600: '#9A5E0C',

  red50: '#FDECEC',
  red400: '#EF5B5B',
  red500: '#D93838',
  red600: '#A82727',

  white: '#FFFFFF',
  black: '#000000',
} as const;

/** Les couleurs utilisables par l'application, par leur rôle. */
export interface ColorTokens {
  /** Fond de l'écran. */
  surface: string;
  /** Cartes et barres posées sur le fond. */
  surfaceRaised: string;
  /** Zones discrètes : champs, pastilles, lignes alternées. */
  surfaceMuted: string;
  /** Fond d'une zone sélectionnée ou mise en avant. */
  surfaceAccent: string;
  border: string;
  borderStrong: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  /** Texte posé sur `accent`, `success`, `danger`… */
  textOnAccent: string;
  accent: string;
  accentPressed: string;
  accentSoft: string;
  accentText: string;
  success: string;
  successSoft: string;
  successText: string;
  warning: string;
  warningSoft: string;
  warningText: string;
  danger: string;
  dangerSoft: string;
  dangerText: string;
  /** Voile des fenêtres modales. */
  overlay: string;
  /** Blocs de chargement. */
  skeleton: string;
}

export type ThemeName = 'light' | 'dark';

/** Espacements (multiples de 4) : une seule échelle pour toute l'application. */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  '2xl': 32,
  '3xl': 40,
  '4xl': 48,
  '5xl': 64,
} as const;

/** Rayons : `pill` pour les pastilles, `full` pour les ronds. */
export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 28,
  pill: 999,
} as const;

/** Échelle typographique : une taille = un usage. */
export const typography = {
  size: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
    '4xl': 36,
  },
  weight: {
    normal: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },
  lineHeight: {
    tight: 1.25,
    normal: 1.5,
    relaxed: 1.75,
  },
} as const;

/** Ombres : mêmes niveaux dans les deux thèmes, valeurs différentes. */
export interface ShadowToken {
  shadowColor: string;
  shadowOffset: { width: number; height: number };
  shadowOpacity: number;
  shadowRadius: number;
  elevation: number;
}

export type ShadowTokens = Record<'none' | 'sm' | 'md' | 'lg', ShadowToken>;

/** Cibles tactiles : jamais moins de 44 px (11.6). */
export const MIN_TOUCH_TARGET = 44;
