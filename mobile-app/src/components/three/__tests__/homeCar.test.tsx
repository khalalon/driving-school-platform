/**
 * Scène d'accueil (13.10, D-52 ; 13b.2, D-53) : de nuit en sombre, de jour en clair, couleurs
 * toutes tirées du thème ; la voiture arrive en freinant (feux stop) puis c'est le décor qui
 * défile, roues qui roulent sans glisser ; l'image fixe de repli existe dans les deux thèmes.
 */
import React from 'react';
import { Circle, Path, Rect } from 'react-native-svg';
import { themes } from '../../../theme';
import {
  CRUISE_SPEED,
  FULL_BRAKE,
  INTRO_DISTANCE,
  INTRO_DURATION,
  WHEEL_RADIUS,
  brakeLevel,
  easeOutCubic,
  homeCarPalette,
  introState,
  scrollOffset,
  wheelTurn,
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
    expect(introState(0)).toMatchObject({ carZ: -INTRO_DISTANCE, speed: 0, done: false });
    const middle = introState(INTRO_DURATION / 2);
    expect(middle.carZ).toBeGreaterThan(-INTRO_DISTANCE);
    expect(middle.carZ).toBeLessThan(0);
    expect(introState(INTRO_DURATION)).toEqual({
      carZ: -0,
      speed: CRUISE_SPEED,
      groundSpeed: CRUISE_SPEED,
      done: true,
    });
    expect(introState(INTRO_DURATION * 3).carZ).toBe(-0);
  });

  it('par rapport à la route, la voiture ne fait que freiner jusqu’à la vitesse de croisière', () => {
    const speeds = Array.from({ length: 19 }, (_, i) => introState((i / 18) * INTRO_DURATION).groundSpeed);
    expect(speeds[0]).toBeGreaterThan(CRUISE_SPEED * 2);
    for (let i = 1; i < speeds.length; i += 1) {
      expect(speeds[i]).toBeLessThanOrEqual(speeds[i - 1] + 1e-9);
      expect(speeds[i]).toBeGreaterThan(0);
    }
    expect(speeds[speeds.length - 1]).toBeCloseTo(CRUISE_SPEED);
  });

  it('la courbe ralentit en fin de course, bornée entre 0 et 1', () => {
    expect(easeOutCubic(0)).toBe(0);
    expect(easeOutCubic(1)).toBe(1);
    expect(easeOutCubic(2)).toBe(1);
    expect(easeOutCubic(0.9) - easeOutCubic(0.8)).toBeLessThan(easeOutCubic(0.2) - easeOutCubic(0.1));
  });

  it('feux stop : allumés au freinage, éteints à vitesse constante ou en accélération', () => {
    expect(brakeLevel(4, 4, 1 / 60)).toBe(0);
    expect(brakeLevel(4, 5, 1 / 60)).toBe(0);
    expect(brakeLevel(10, 10 - FULL_BRAKE / 60, 1 / 60)).toBeCloseTo(1);
    expect(brakeLevel(10, 10 - FULL_BRAKE / 120, 1 / 60)).toBeCloseTo(0.5);
    expect(brakeLevel(20, 0, 1 / 60)).toBe(1);
    expect(brakeLevel(10, 0, 0)).toBe(0);
    // Pendant l'arrivée, la voiture freine : feux stop allumés
    const a = introState(0.2).groundSpeed;
    const b = introState(0.2 + 1 / 60).groundSpeed;
    expect(brakeLevel(a, b, 1 / 60)).toBeGreaterThan(0.5);
  });

  it('les roues roulent sans glisser : un tour pour une circonférence parcourue', () => {
    expect(wheelTurn(2 * Math.PI * WHEEL_RADIUS)).toBeCloseTo(2 * Math.PI);
    expect(wheelTurn(0)).toBe(0);
    // Sens positif = vers l'avant (+z) : le haut de la roue part vers l'avant
    expect(wheelTurn(1)).toBeGreaterThan(0);
  });

  it('le décor défile vers l’arrière de la voiture (-z), en boucle sans sortir de sa plage', () => {
    expect(scrollOffset(2, 0, 24)).toBe(2);
    // La voiture avance vers +z : un tiret devant elle se rapproche puis passe derrière
    expect(scrollOffset(2, 1, 24)).toBe(1);
    expect(scrollOffset(2, 3, 24)).toBe(23);
    expect(scrollOffset(10, 0.5, 24)).toBeLessThan(10);
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
