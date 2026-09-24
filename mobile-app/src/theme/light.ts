/** Thème clair (D-48) : fond sable, encre foncée, accent bleu profond. */

import { ColorTokens, ShadowTokens, palette } from './tokens';

export const lightColors: ColorTokens = {
  surface: palette.sand50,
  surfaceRaised: palette.white,
  surfaceMuted: palette.sand100,
  surfaceAccent: palette.blue50,

  border: palette.sand200,
  borderStrong: palette.ink300,

  textPrimary: palette.ink900,
  textSecondary: palette.ink600,
  textMuted: palette.ink500,
  textOnAccent: palette.white,

  accent: palette.blue600,
  accentPressed: palette.blue700,
  accentSoft: palette.blue50,
  accentText: palette.blue700,

  success: palette.green500,
  successSoft: palette.green50,
  successText: palette.green600,

  warning: palette.amber500,
  warningSoft: palette.amber50,
  warningText: palette.amber600,

  danger: palette.red500,
  dangerSoft: palette.red50,
  dangerText: palette.red600,

  overlay: 'rgba(17, 21, 31, 0.55)',
  skeleton: palette.sand200,
};

/** Ombres : discrètes en clair, où la lumière vient du haut. */
export const lightShadows: ShadowTokens = {
  none: {
    shadowColor: palette.black,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  sm: {
    shadowColor: palette.ink900,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },
  md: {
    shadowColor: palette.ink900,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
  },
  lg: {
    shadowColor: palette.ink900,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.14,
    shadowRadius: 20,
    elevation: 6,
  },
};
