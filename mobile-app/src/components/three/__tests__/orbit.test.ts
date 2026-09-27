/**
 * Voiture au doigt et inclinaison (13b.4, D-53) : la voiture suit le doigt, l'élan s'amortit,
 * la caméra revient seule à son balancement par le chemin le plus court, et l'inclinaison se
 * mesure par rapport à la position de repos, dans des bornes étroites.
 */
import {
  ORBIT,
  clearTilt,
  createOrbit,
  dragOrbit,
  isHorizontalDrag,
  releaseDrag,
  setTilt,
  startDrag,
  stepOrbit,
  tiltOffset,
  wrapAngle,
} from '../orbit';

const run = (orbit: ReturnType<typeof createOrbit>, seconds: number) => {
  for (let t = 0; t < seconds; t += 1 / 60) stepOrbit(orbit, 1 / 60);
};

describe('geste', () => {
  it('glisser vers la droite fait tourner la caméra dans l’autre sens (la voiture suit le doigt)', () => {
    const orbit = createOrbit();
    startDrag(orbit);
    dragOrbit(orbit, 100);
    expect(orbit.offset).toBeCloseTo(-100 * ORBIT.radiansPerPixel);
    // Pendant le geste, rien ne bouge tout seul
    run(orbit, 1);
    expect(orbit.offset).toBeCloseTo(-100 * ORBIT.radiansPerPixel);
  });

  it('au lâcher, l’élan continue puis s’amortit, borné', () => {
    const orbit = createOrbit();
    startDrag(orbit);
    releaseDrag(orbit, 1); // 1 px/ms vers la droite
    expect(orbit.velocity).toBeLessThan(0);
    const start = orbit.offset;
    run(orbit, 0.5);
    expect(orbit.offset).toBeLessThan(start);
    expect(Math.abs(orbit.velocity)).toBeLessThan(ORBIT.maxVelocity);
    run(orbit, 4);
    expect(orbit.velocity).toBe(0);

    releaseDrag(orbit, -50);
    expect(orbit.velocity).toBe(ORBIT.maxVelocity);
  });

  it('après quelques secondes sans geste, retour au balancement par le chemin le plus court', () => {
    const orbit = createOrbit();
    orbit.offset = 2 * Math.PI + 0.5; // un tour et demi-radian : le retour ne refait pas le tour
    run(orbit, ORBIT.returnDelay - 0.2);
    expect(orbit.offset).toBeCloseTo(2 * Math.PI + 0.5);
    run(orbit, 0.4);
    expect(orbit.offset).toBeLessThan(0.5);
    run(orbit, 10);
    expect(orbit.offset).toBe(0);
  });

  it('un nouveau geste relance le délai avant le retour', () => {
    const orbit = createOrbit();
    orbit.offset = 1;
    run(orbit, ORBIT.returnDelay - 0.5);
    startDrag(orbit);
    dragOrbit(orbit, 0);
    releaseDrag(orbit, 0);
    run(orbit, ORBIT.returnDelay - 0.5);
    expect(orbit.offset).toBeCloseTo(1);
  });

  it('wrapAngle ramène dans ]-π, π]', () => {
    expect(wrapAngle(0)).toBe(0);
    expect(wrapAngle(2 * Math.PI + 0.5)).toBeCloseTo(0.5);
    expect(wrapAngle(-2 * Math.PI - 0.5)).toBeCloseTo(-0.5);
    expect(wrapAngle(Math.PI)).toBeCloseTo(Math.PI);
    expect(wrapAngle(-Math.PI)).toBeCloseTo(Math.PI);
  });

  it('seul un geste horizontal franc est pris par la scène', () => {
    expect(isHorizontalDrag(30, 5)).toBe(true);
    expect(isHorizontalDrag(-30, 5)).toBe(true);
    expect(isHorizontalDrag(5, 30)).toBe(false);
    expect(isHorizontalDrag(20, 18)).toBe(false);
    expect(isHorizontalDrag(4, 0)).toBe(false);
  });
});

describe('inclinaison', () => {
  it('la position de repos ne décale rien ; bouger décale, dans des bornes', () => {
    const orbit = createOrbit();
    setTilt(orbit, 0.1, -0.7); // téléphone tenu penché : c'est le repos
    run(orbit, 1);
    expect(Math.abs(tiltOffset(orbit).angle)).toBeLessThan(1e-6);
    expect(Math.abs(tiltOffset(orbit).height)).toBeLessThan(1e-6);

    setTilt(orbit, 0.9, 0.3); // mouvement franc
    run(orbit, 0.4);
    expect(tiltOffset(orbit).angle).toBeGreaterThan(0);
    expect(Math.abs(tiltOffset(orbit).angle)).toBeLessThanOrEqual(ORBIT.maxTiltAngle);
    expect(Math.abs(tiltOffset(orbit).height)).toBeLessThanOrEqual(ORBIT.maxTiltHeight);
  });

  it('tenu immobile dans sa nouvelle position, l’effet revient doucement au centre', () => {
    const orbit = createOrbit();
    setTilt(orbit, 0, -0.7);
    run(orbit, 0.5);
    setTilt(orbit, 0.2, -0.7);
    run(orbit, 0.3);
    const moved = tiltOffset(orbit).angle;
    expect(moved).toBeGreaterThan(0);
    run(orbit, 8);
    expect(tiltOffset(orbit).angle).toBeLessThan(moved / 5);
  });

  it('capteur arrêté : retour au centre', () => {
    const orbit = createOrbit();
    setTilt(orbit, 0, 0);
    setTilt(orbit, 0.5, 0);
    run(orbit, 0.5);
    expect(tiltOffset(orbit).angle).toBeGreaterThan(0);
    clearTilt(orbit);
    run(orbit, 2);
    expect(tiltOffset(orbit).angle).toBeCloseTo(0, 3);
    // Au redémarrage, la première mesure redevient le repos
    setTilt(orbit, 0.4, 0);
    run(orbit, 0.5);
    expect(Math.abs(tiltOffset(orbit).angle)).toBeLessThan(1e-6);
  });
});
