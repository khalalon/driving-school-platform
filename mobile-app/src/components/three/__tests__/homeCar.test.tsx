/**
 * Scène d'accueil (13.10, D-52) : de nuit en sombre, de jour en clair, couleurs toutes tirées du
 * thème ; la voiture arrive en ralentissant puis c'est le décor qui défile ; l'image fixe de
 * repli existe dans les deux thèmes.
 */
import React from 'react';
import { Circle, Path, Rect } from 'react-native-svg';
import { themes } from '../../../theme';
import {
  CRUISE_SPEED,
  INTRO_DISTANCE,
  INTRO_DURATION,
  easeOutCubic,
  homeCarPalette,
  introState,
  scrollOffset,
} from '../homeCar';
import { HomeCarFallback } from '../HomeCarFallback';
import {
  allowedColors,
  bothThemes,
  renderInTheme,
  unmountInTheme,
} from '../../ui/__tests__/renderInTheme';

describe('homeCarPalette', () => {
  it('de nuit en thème sombre, de jour en thème clair, phares plus forts la nuit', () => {
    const night = homeCarPalette(themes.dark);
    const day = homeCarPalette(themes.light);
    expect(night.mode).toBe('night');
    expect(day.mode).toBe('day');
    expect(night.headlightIntensity).toBeGreaterThan(day.headlightIntensity);
    expect(night.fogFar).toBeLessThan(day.fogFar);
  });

  it.each(['dark', 'light'] as const)('thème %s : toutes les couleurs viennent du thème', (name) => {
    const allowed = allowedColors(themes[name]);
    const palette = homeCarPalette(themes[name]);
    for (const [key, value] of Object.entries(palette)) {
      if (typeof value === 'string' && value.startsWith('#')) {
        expect({ key, fromTheme: allowed.has(value.toLowerCase()) }).toEqual({ key, fromTheme: true });
      }
    }
  });

  it('le marquage au sol et les faisceaux sont jaune signal', () => {
    for (const theme of Object.values(themes)) {
      expect(homeCarPalette(theme).line).toBe(theme.colors.signal);
      expect(homeCarPalette(theme).beam).toBe(theme.colors.signal);
    }
  });
});

describe('arrivée de la voiture', () => {
  it('part de l’obscurité, ralentit et s’arrête à sa place', () => {
    expect(introState(0)).toEqual({ carZ: -INTRO_DISTANCE, speed: 0, done: false });
    const middle = introState(INTRO_DURATION / 2);
    expect(middle.carZ).toBeGreaterThan(-INTRO_DISTANCE);
    expect(middle.carZ).toBeLessThan(0);
    expect(introState(INTRO_DURATION)).toEqual({ carZ: -0, speed: CRUISE_SPEED, done: true });
    expect(introState(INTRO_DURATION * 3).carZ).toBe(-0);
  });

  it('la courbe ralentit en fin de course, bornée entre 0 et 1', () => {
    expect(easeOutCubic(0)).toBe(0);
    expect(easeOutCubic(1)).toBe(1);
    expect(easeOutCubic(2)).toBe(1);
    expect(easeOutCubic(0.9) - easeOutCubic(0.8)).toBeLessThan(easeOutCubic(0.2) - easeOutCubic(0.1));
  });

  it('le décor défile en boucle sans sortir de sa plage', () => {
    expect(scrollOffset(2, 0, 24)).toBe(2);
    expect(scrollOffset(2, 23, 24)).toBe(1);
    expect(scrollOffset(22, 100, 24)).toBeGreaterThanOrEqual(0);
    expect(scrollOffset(22, 100, 24)).toBeLessThan(24);
  });
});

describe('HomeCarFallback', () => {
  it.each(bothThemes)('thème %s : image fixe aux seules couleurs du thème', (name, theme) => {
    const tree = renderInTheme(<HomeCarFallback />, name);
    const allowed = allowedColors(theme);
    const fills = [Rect, Path, Circle].flatMap((type) =>
      tree.root.findAllByType(type).map((node) => String(node.props.fill).toLowerCase())
    );
    expect(fills.length).toBeGreaterThan(5);
    expect(fills.filter((fill) => !allowed.has(fill))).toEqual([]);
    unmountInTheme(tree);
  });
});
