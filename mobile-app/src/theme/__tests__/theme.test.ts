/**
 * Jetons « Circuit » (D-52, principe D-48) : les deux thèmes servent exactement les mêmes
 * jetons, les paires texte / fond réellement utilisées respectent le contraste AA (≥ 4,5:1) et
 * les éléments graphiques porteurs de sens (jauge, télémétrie, bordures) ≥ 3:1 sur leur fond.
 * Le contraste est mesuré, pas jugé à l'œil.
 */
import { ColorTokens, darkTheme, lightTheme, themes } from '../index';

/** Canal linéarisé (sRGB → luminance relative), formule WCAG 2.1. */
const channel = (value: number): number => {
  const c = value / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};

const luminance = (hex: string): number => {
  const value = hex.replace('#', '');
  const full =
    value.length === 3
      ? value
          .split('')
          .map((c) => c + c)
          .join('')
      : value;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
};

/** Rapport de contraste entre deux couleurs opaques. */
export const contrast = (a: string, b: string): number => {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
};

/** Paires réellement affichées : texte sur son fond. */
const PAIRS: [keyof ColorTokens, keyof ColorTokens][] = [
  ['textPrimary', 'surface'],
  ['textPrimary', 'surfaceRaised'],
  ['textPrimary', 'surfaceMuted'],
  ['textSecondary', 'surface'],
  ['textSecondary', 'surfaceRaised'],
  ['textSecondary', 'surfaceMuted'],
  ['textMuted', 'surface'],
  ['textMuted', 'surfaceRaised'],
  ['textMuted', 'surfaceMuted'],
  ['textOnSignal', 'signal'],
  ['textOnSignal', 'signalPressed'],
  ['textOnDanger', 'danger'],
  ['signalText', 'surface'],
  ['signalText', 'surfaceRaised'],
  ['signalText', 'signalSoft'],
  ['textPrimary', 'surfaceSignal'],
  ['telemetryText', 'telemetrySoft'],
  ['telemetryText', 'surfaceRaised'],
  ['successText', 'successSoft'],
  ['warningText', 'warningSoft'],
  ['dangerText', 'dangerSoft'],
];

/** Éléments graphiques porteurs de sens sur leur fond (WCAG 1.4.11, ≥ 3:1). */
const GRAPHIC_PAIRS: [keyof ColorTokens, keyof ColorTokens][] = [
  ['gauge', 'surfaceRaised'],
  ['gauge', 'surface'],
  ['telemetry', 'surfaceRaised'],
  ['borderStrong', 'surfaceRaised'],
  ['borderStrong', 'surface'],
  ['danger', 'surfaceRaised'],
];

describe('jetons de thème (D-52)', () => {
  it('les deux thèmes servent les mêmes jetons', () => {
    expect(Object.keys(darkTheme.colors).sort()).toEqual(Object.keys(lightTheme.colors).sort());
    expect(Object.keys(darkTheme.shadows).sort()).toEqual(Object.keys(lightTheme.shadows).sort());
  });

  it('aucun jeton vide', () => {
    for (const theme of Object.values(themes)) {
      for (const [name, value] of Object.entries(theme.colors)) {
        expect(`${theme.name}.${name}=${value.trim()}`).not.toBe(`${theme.name}.${name}=`);
      }
    }
  });

  it('les écrans partagent une seule échelle d’espacement et de typographie', () => {
    expect(darkTheme.spacing).toBe(lightTheme.spacing);
    expect(darkTheme.typography).toBe(lightTheme.typography);
    expect(darkTheme.radius).toBe(lightTheme.radius);
  });

  it('style à plat : seules les surfaces flottantes (lg) portent une ombre', () => {
    for (const theme of Object.values(themes)) {
      expect(theme.shadows.none.elevation).toBe(0);
      expect(theme.shadows.sm.elevation).toBe(0);
      expect(theme.shadows.md.elevation).toBe(0);
      expect(theme.shadows.lg.elevation).toBeGreaterThan(0);
    }
  });

  it('le jaune signal est le même aplat dans les deux thèmes (identité D-52)', () => {
    expect(darkTheme.colors.signal).toBe('#FFC21A');
    expect(lightTheme.colors.signal).toBe('#FFC21A');
    expect(darkTheme.colors.surface).toBe('#0A0C0F');
  });
});

describe('contraste des paires texte / fond (AA, ≥ 4,5:1)', () => {
  for (const theme of Object.values(themes)) {
    for (const [text, background] of PAIRS) {
      it(`${theme.name} : ${text} sur ${background}`, () => {
        const ratio = contrast(theme.colors[text], theme.colors[background]);
        expect({ pair: `${text}/${background}`, ratio: Number(ratio.toFixed(2)) }).toMatchObject({
          pair: `${text}/${background}`,
        });
        expect(ratio).toBeGreaterThanOrEqual(4.5);
      });
    }
  }
});

describe('contraste des éléments graphiques (≥ 3:1)', () => {
  for (const theme of Object.values(themes)) {
    for (const [graphic, background] of GRAPHIC_PAIRS) {
      it(`${theme.name} : ${graphic} sur ${background}`, () => {
        expect(contrast(theme.colors[graphic], theme.colors[background])).toBeGreaterThanOrEqual(3);
      });
    }
  }
});
