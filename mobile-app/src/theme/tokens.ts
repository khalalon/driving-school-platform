/**
 * Jetons de design « Circuit » (D-52, principe D-48). Les écrans ne connaissent que des noms
 * **sémantiques** : ils demandent `surface` ou `signal`, jamais un jaune précis. Chaque jeton
 * existe dans les deux thèmes (`light.ts`, `dark.ts`) — un test refuse toute absence et tout
 * contraste insuffisant.
 */

/** Palette brute : la seule liste de couleurs du projet. Personne d'autre ne l'importe. */
export const palette = {
  // Asphalte : fonds et surfaces du thème sombre, du plus profond au plus clair
  asphalt950: '#0A0C0F',
  asphalt900: '#14171C',
  asphalt850: '#1D2128',
  asphalt800: '#23282F',
  asphalt700: '#272C34',
  asphalt600: '#3A414B',

  // Gris béton : textes secondaires (sombre) et filets (clair)
  concrete100: '#EEF0F3',
  concrete200: '#E3E6EB',
  concrete250: '#DDE1E7',
  concrete300: '#D3D8DF',
  concrete400: '#9BA3AF',
  concrete450: '#7C8594',
  concrete500: '#5A6372',
  concrete600: '#3A4250',
  concrete900: '#0E1116',

  // Craie : textes du thème sombre
  chalk50: '#F3F4F6',
  chalk200: '#C9CED6',

  // Jaune signal : marquage au sol, action principale, progression
  signal400: '#FFC21A',
  signal500: '#E6A800',
  signal600: '#B07D00',
  signal800: '#7A5A00',
  signalSoftLight: '#FFF3CC',
  signalSoftDark: '#2A2310',

  // Turquoise télémétrie : étape en cours, information
  telemetry300: '#5EEAD4',
  telemetry400: '#2DD4BF',
  telemetry700: '#0F766E',
  telemetry800: '#0B5C55',
  telemetrySoftLight: '#D5F3EF',
  telemetrySoftDark: '#0F2E2B',

  green300: '#7BE3AE',
  green400: '#3DD68C',
  green700: '#15803D',
  green800: '#166534',
  greenSoftLight: '#DCFCE7',
  greenSoftDark: '#0F2A1E',

  // Orange (et non jaune) pour « en attente » : ne pas confondre avec le signal
  orange300: '#FFB380',
  orange400: '#FF8A3D',
  orange700: '#C2410C',
  orange800: '#9A3412',
  orangeSoftLight: '#FFEDD5',
  orangeSoftDark: '#33190A',

  red300: '#FF8A80',
  red400: '#FF5A4E',
  red600: '#DC2626',
  red800: '#991B1B',
  redSoftLight: '#FEE2E2',
  redSoftDark: '#3A1614',

  white: '#FFFFFF',
  black: '#000000',
} as const;

/** Les couleurs utilisables par l'application, par leur rôle. */
export interface ColorTokens {
  /** Fond de l'écran. */
  surface: string;
  /** Cartes et barres posées sur le fond. */
  surfaceRaised: string;
  /** Zones discrètes : champs, pastilles, pistes de jauge, lignes alternées. */
  surfaceMuted: string;
  /** Fond d'une zone sélectionnée ou mise en avant (teinte signal). */
  surfaceSignal: string;
  /** Filets : le style « Circuit » est à plat, la profondeur vient des filets, pas des ombres. */
  border: string;
  /** Filet porteur de sens (bordure de champ, bouton contour) : ≥ 3:1 sur son fond. */
  borderStrong: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  /** Texte posé sur `signal` (et `success`, `telemetry`). */
  textOnSignal: string;
  /** Texte posé sur `danger`. */
  textOnDanger: string;
  /** Jaune signal : action principale. */
  signal: string;
  signalPressed: string;
  signalSoft: string;
  /** Texte ou icône en couleur signal, lisible sur `surface`, `surfaceRaised` et `signalSoft`. */
  signalText: string;
  /** Turquoise télémétrie : étape en cours, information. */
  telemetry: string;
  telemetrySoft: string;
  telemetryText: string;
  /** Arc et barres de progression (≥ 3:1 sur `surfaceRaised`). */
  gauge: string;
  /** Piste non remplie d'une jauge. */
  gaugeTrack: string;
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

/** Rayons resserrés (D-52) : angles nets d'un tableau de bord ; `pill` pour les pastilles rondes. */
export const radius = {
  xs: 4,
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  '2xl': 16,
  pill: 999,
} as const;

/** Échelle typographique : une taille = un usage. Rôles et polices arrivent en 13.2. */
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

/**
 * Ombres : le style « Circuit » est à plat. `none`, `sm` et `md` ne portent aucune ombre (les
 * cartes se détachent par leur filet) ; seul `lg` garde une profondeur, pour ce qui flotte
 * au-dessus du contenu (toast, feuille, fenêtre).
 */
export interface ShadowToken {
  shadowColor: string;
  shadowOffset: { width: number; height: number };
  shadowOpacity: number;
  shadowRadius: number;
  elevation: number;
}

export type ShadowTokens = Record<'none' | 'sm' | 'md' | 'lg', ShadowToken>;

const FLAT: ShadowToken = {
  shadowColor: palette.black,
  shadowOffset: { width: 0, height: 0 },
  shadowOpacity: 0,
  shadowRadius: 0,
  elevation: 0,
};

/** Ombres d'un thème : à plat partout sauf `lg`, dont l'opacité dépend du fond. */
export const flatShadows = (floatingOpacity: number): ShadowTokens => ({
  none: FLAT,
  sm: FLAT,
  md: FLAT,
  lg: {
    shadowColor: palette.black,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: floatingOpacity,
    shadowRadius: 16,
    elevation: 8,
  },
});

/** Cibles tactiles : jamais moins de 44 px (11.6). */
export const MIN_TOUCH_TARGET = 44;
