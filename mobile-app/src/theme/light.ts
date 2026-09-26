/**
 * Thème clair « Circuit » (D-52) : béton clair, encre, jaune signal en aplat (texte foncé
 * dessus) et en texte bronze `signalText` là où le jaune serait illisible sur fond clair.
 */

import { ColorTokens, ShadowTokens, flatShadows, palette } from './tokens';

export const lightColors: ColorTokens = {
  surface: palette.concrete100,
  surfaceRaised: palette.white,
  surfaceMuted: palette.concrete200,
  surfaceSignal: palette.signalSoftLight,

  border: palette.concrete300,
  borderStrong: palette.concrete450,

  textPrimary: palette.concrete900,
  textSecondary: palette.concrete600,
  textMuted: palette.concrete500,
  textOnSignal: palette.concrete900,
  textOnDanger: palette.white,

  signal: palette.signal400,
  signalPressed: palette.signal500,
  signalSoft: palette.signalSoftLight,
  signalText: palette.signal800,

  telemetry: palette.telemetry700,
  telemetrySoft: palette.telemetrySoftLight,
  telemetryText: palette.telemetry800,

  gauge: palette.signal600,
  gaugeTrack: palette.concrete250,

  success: palette.green700,
  successSoft: palette.greenSoftLight,
  successText: palette.green800,

  warning: palette.orange700,
  warningSoft: palette.orangeSoftLight,
  warningText: palette.orange800,

  danger: palette.red600,
  dangerSoft: palette.redSoftLight,
  dangerText: palette.red800,

  overlay: 'rgba(14, 17, 22, 0.55)',
  skeleton: palette.concrete200,
};

export const lightShadows: ShadowTokens = flatShadows(0.14);
