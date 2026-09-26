/**
 * Rôles typographiques « Circuit » (13.2, D-52) : Barlow Condensed / Barlow en français, Cairo
 * sans capitales ni espacement en arabe, chiffres tabulaires en Barlow Condensed partout, et
 * chaque famille utilisée par un style est bien chargée au démarrage.
 */
import React from 'react';
import { Text } from 'react-native';
import { act, create } from 'react-test-renderer';
import { applyLanguage } from '../../i18n';
import { FONT_ASSETS } from '../fontAssets';
import { fontFamilies } from '../fonts';
import { TEXT_ROLES, TextRole, textStyle } from '../typography';
import { useTextStyle } from '../useTextStyle';

const ROLES = Object.keys(TEXT_ROLES) as TextRole[];
const LATIN = new Set<string>([
  ...Object.values(fontFamilies.condensed),
  ...Object.values(fontFamilies.sans),
]);
const ARABIC = new Set<string>(Object.values(fontFamilies.arabic));

afterEach(() => applyLanguage('fr'));

describe('rôles en français', () => {
  it.each(ROLES)('%s : famille Barlow, jamais fontWeight', (role) => {
    const style = textStyle(role, 'fr');
    expect(LATIN.has(style.fontFamily as string)).toBe(true);
    expect(style.fontWeight).toBeUndefined();
    expect(style.lineHeight).toBeGreaterThanOrEqual(TEXT_ROLES[role].fontSize);
  });

  it('titres et libellés en capitales condensées, texte courant en Barlow', () => {
    expect(textStyle('label', 'fr')).toMatchObject({
      fontFamily: fontFamilies.condensed.bold,
      textTransform: 'uppercase',
    });
    expect(textStyle('label', 'fr').letterSpacing).toBeGreaterThan(0);
    expect(textStyle('title', 'fr').textTransform).toBe('uppercase');
    expect(textStyle('body', 'fr').fontFamily).toBe(fontFamilies.sans.regular);
    expect(textStyle('body', 'fr').textTransform).toBeUndefined();
  });
});

describe('rôles en arabe', () => {
  it.each(ROLES.filter((role) => role !== 'numeric'))(
    '%s : Cairo, sans capitales ni espacement de lettres',
    (role) => {
      const style = textStyle(role, 'ar');
      expect(ARABIC.has(style.fontFamily as string)).toBe(true);
      expect(style.textTransform).toBe('none');
      expect(style.letterSpacing).toBe(0);
      expect(style.lineHeight).toBeGreaterThanOrEqual(Math.round(TEXT_ROLES[role].fontSize * 1.5));
    }
  );

  it('les chiffres restent en Barlow Condensed tabulaire (chiffres latins dans les deux langues)', () => {
    expect(textStyle('numeric', 'ar')).toEqual(textStyle('numeric', 'fr'));
    expect(textStyle('numeric', 'ar').fontVariant).toEqual(['tabular-nums']);
  });
});

describe('chargement des polices', () => {
  it('toute famille nommée par un style est chargée par useFonts', () => {
    const loaded = new Set(Object.keys(FONT_ASSETS));
    for (const role of ROLES) {
      for (const language of ['fr', 'ar'] as const) {
        expect(loaded.has(textStyle(role, language).fontFamily as string)).toBe(true);
      }
    }
  });
});

describe('useTextStyle', () => {
  const Probe = ({ role }: { role: TextRole }) => <Text style={useTextStyle(role)}>x</Text>;

  it('suit la langue courante, sans LanguageProvider', () => {
    let tree!: ReturnType<typeof create>;
    act(() => {
      tree = create(<Probe role="title" />);
    });
    expect(tree.root.findByType(Text).props.style.fontFamily).toBe(fontFamilies.condensed.bold);

    act(() => applyLanguage('ar'));
    expect(tree.root.findByType(Text).props.style.fontFamily).toBe(fontFamilies.arabic.bold);
    act(() => tree.unmount());
  });
});
