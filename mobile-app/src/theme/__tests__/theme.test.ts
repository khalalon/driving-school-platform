/**
 * Jetons de design (D-48) : les deux thèmes servent exactement les mêmes jetons, et les paires
 * texte / fond réellement utilisées par l'application respectent le contraste AA (≥ 4,5:1).
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
  ['textSecondary', 'surface'],
  ['textSecondary', 'surfaceRaised'],
  ['textSecondary', 'surfaceMuted'],
  ['textOnAccent', 'accent'],
  ['textOnAccent', 'danger'],
  ['accentText', 'accentSoft'],
  ['successText', 'successSoft'],
  ['warningText', 'warningSoft'],
  ['dangerText', 'dangerSoft'],
];

describe('jetons de thème (D-48)', () => {
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
