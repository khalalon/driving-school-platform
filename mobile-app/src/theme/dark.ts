/**
 * Thème sombre (D-48) : encre profonde plutôt que noir pur (moins fatigant, moins de halo sur
 * les écrans OLED), accent éclairci pour rester lisible sur fond sombre.
 */

import { ColorTokens, ShadowTokens, palette } from './tokens';

export const darkColors: ColorTokens = {
  surface: palette.ink900,
  surfaceRaised: palette.ink800,
  surfaceMuted: palette.ink700,
  surfaceAccent: '#1A2547',

  border: palette.ink700,
  borderStrong: palette.ink500,

  textPrimary: palette.ink50,
  textSecondary: palette.ink200,
  textMuted: palette.ink300,
  // Les couleurs vives du thème sombre sont claires : le texte posé dessus doit être foncé
  textOnAccent: palette.ink900,

  accent: palette.blue400,
  accentPressed: palette.blue300,
  accentSoft: '#1A2547',
  accentText: palette.blue200,

  success: palette.green400,
  successSoft: '#12301F',
  successText: '#7BD9A8',

  warning: palette.amber400,
  warningSoft: '#33240C',
  warningText: '#F0C27B',

  danger: palette.red400,
  dangerSoft: '#3A1414',
  dangerText: '#F09292',

  overlay: 'rgba(0, 0, 0, 0.66)',
  skeleton: palette.ink700,
};

/**
 * En sombre, l'ombre portée ne se voit pas : la profondeur vient du fond des surfaces
 * (`surfaceRaised` plus clair que `surface`). On garde l'élévation pour Android.
 */
export const darkShadows: ShadowTokens = {
  none: {
    shadowColor: palette.black,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  sm: {
    shadowColor: palette.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 1,
  },
  md: {
    shadowColor: palette.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 3,
  },
  lg: {
    shadowColor: palette.black,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 6,
  },
};
