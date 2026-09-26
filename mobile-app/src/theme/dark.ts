/**
 * Thème sombre « Circuit » (D-52) : asphalte profond, craie pour le texte, jaune signal pour
 * l'action et la progression, turquoise télémétrie pour l'étape en cours. Thème du premier
 * lancement (13.3).
 */

import { ColorTokens, ShadowTokens, flatShadows, palette } from './tokens';

export const darkColors: ColorTokens = {
  surface: palette.asphalt950,
  surfaceRaised: palette.asphalt900,
  surfaceMuted: palette.asphalt850,
  surfaceSignal: palette.signalSoftDark,

  border: palette.asphalt700,
  borderStrong: palette.concrete450,

  textPrimary: palette.chalk50,
  textSecondary: palette.chalk200,
  textMuted: palette.concrete400,
  // Les aplats vifs du thème sombre sont clairs : le texte posé dessus est foncé
  textOnSignal: palette.asphalt950,
  textOnDanger: palette.asphalt950,

  signal: palette.signal400,
  signalPressed: palette.signal500,
  signalSoft: palette.signalSoftDark,
  signalText: palette.signal400,

  telemetry: palette.telemetry400,
  telemetrySoft: palette.telemetrySoftDark,
  telemetryText: palette.telemetry300,

  gauge: palette.signal400,
  gaugeTrack: palette.asphalt800,

  success: palette.green400,
  successSoft: palette.greenSoftDark,
  successText: palette.green300,

  warning: palette.orange400,
  warningSoft: palette.orangeSoftDark,
  warningText: palette.orange300,

  danger: palette.red400,
  dangerSoft: palette.redSoftDark,
  dangerText: palette.red300,

  overlay: 'rgba(0, 0, 0, 0.72)',
  skeleton: palette.asphalt850,
};

/** En sombre, seule une ombre franche se voit encore sous ce qui flotte. */
export const darkShadows: ShadowTokens = flatShadows(0.6);
