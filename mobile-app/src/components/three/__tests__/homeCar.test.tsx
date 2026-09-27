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
  TRAFFIC,
  TRAFFIC_CYCLE,
  WHEEL_RADIUS,
  brakeLevel,
  cameraRig,
  easeOutCubic,
  homeCarPalette,
  introState,
  scrollOffset,
  signalFocus,
  trafficState,
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

describe('feu tricolore (13b.3)', () => {
  const STEP = 1 / 60;
  const samples = Array.from({ length: Math.round(TRAFFIC_CYCLE / STEP) }, (_, i) => {
    const t = i * STEP;
    return { t, ...trafficState(t) };
  });

  it('jamais de marche arrière : la vitesse reste entre 0 et la croisière', () => {
    for (const sample of samples) {
      expect(sample.speed).toBeGreaterThanOrEqual(0);
      expect(sample.speed).toBeLessThanOrEqual(CRUISE_SPEED + 1e-9);
    }
    // Le feu ne recule jamais vers la voiture : sa distance ne fait que diminuer
    for (let i = 1; i < samples.length; i += 1) {
      expect(samples[i].lightDistance).toBeLessThanOrEqual(samples[i - 1].lightDistance + 1e-9);
    }
  });

  it('la voiture s’arrête avant la ligne, au rouge, pied sur le frein', () => {
    const stopped = samples.filter((sample) => sample.speed === 0);
    expect(stopped.length).toBeGreaterThan(0);
    for (const sample of stopped) {
      expect(sample.lightDistance).toBeCloseTo(TRAFFIC.stopGap);
      expect(sample.lightDistance).toBeGreaterThan(0);
    }
    // Rouge pendant tout l'arrêt ; seule la dernière image, celle du départ, est verte
    for (const sample of stopped.slice(0, -1)) {
      expect(sample.signal).toBe('red');
      expect(sample.braking).toBe(1);
    }
    expect(stopped[stopped.length - 1].signal).toBe('green');
    // Tant que la ligne n'est pas passée, la voiture n'y arrive jamais au rouge
    for (const sample of samples) {
      if (sample.signal !== 'green') expect(sample.lightDistance).toBeGreaterThan(0);
    }
  });

  it('jamais de départ au rouge : la voiture n’accélère qu’au vert', () => {
    for (let i = 1; i < samples.length; i += 1) {
      if (samples[i].speed > samples[i - 1].speed + 1e-9) {
        expect({ t: samples[i].t, signal: samples[i].signal }).toEqual({
          t: samples[i].t,
          signal: 'green',
        });
      }
    }
  });

  it('les couleurs se suivent vert → orange → rouge → vert, une fois par cycle', () => {
    const order = samples
      .map((sample) => sample.signal)
      .filter((signal, i, all) => i === 0 || signal !== all[i - 1]);
    expect(order).toEqual(['green', 'orange', 'red', 'green']);
  });

  it('le cycle se répète sans à-coup, le feu hors champ au moment du raccord', () => {
    const end = trafficState(TRAFFIC_CYCLE - 1e-6);
    const start = trafficState(TRAFFIC_CYCLE);
    expect(start.speed).toBeCloseTo(end.speed);
    expect(start.speed).toBe(CRUISE_SPEED);
    // Le feu apparaît derrière la caméra et disparaît dans le brouillard du fond
    expect(start.lightDistance).toBeGreaterThan(18);
    expect(end.lightDistance).toBeLessThan(-18);
    expect(trafficState(TRAFFIC_CYCLE * 3 + 5)).toEqual(trafficState(5));
  });

  it('la caméra s’élargit quand le feu est proche, et seulement alors', () => {
    expect(signalFocus(40)).toBe(0);
    expect(signalFocus(-20)).toBe(0);
    // Voiture arrêtée à la ligne : plan large complet
    expect(signalFocus(TRAFFIC.stopGap)).toBe(1);
    const far = cameraRig(0, 40);
    const near = cameraRig(0, TRAFFIC.stopGap);
    expect(near.distance).toBeGreaterThan(far.distance);
    expect(near.lookY).toBeGreaterThan(far.lookY);
    // La visée glisse vers le feu, planté sur le bas-côté droit de la voiture (côté -x)
    expect(near.lookX).toBeLessThan(far.lookX);
    // Sans à-coup : le poids varie peu d'une image à l'autre sur tout le cycle
    let previous = signalFocus(trafficState(0).lightDistance);
    for (let t = 1 / 60; t < TRAFFIC_CYCLE; t += 1 / 60) {
      const focus = signalFocus(trafficState(t).lightDistance);
      expect(Math.abs(focus - previous)).toBeLessThan(0.05);
      previous = focus;
    }
  });

  it('la fin de l’arrivée enchaîne sur la croisière du cycle', () => {
    expect(introState(INTRO_DURATION).groundSpeed).toBeCloseTo(trafficState(0).speed);
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
