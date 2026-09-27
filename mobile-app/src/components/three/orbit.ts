/**
 * Voiture au doigt et inclinaison du téléphone (13b.4, D-53), sans three.js ni React Native :
 * l'état de l'orbite est un objet mutable partagé entre l'écran (qui le crée avec `useOrbit`),
 * `Scene3D` (qui y écrit le geste et le capteur) et la scène (qui le lit à chaque image). Rien
 * ne passe par l'état React : aucun rendu pendant le geste.
 *
 * - Glisser horizontalement fait tourner la caméra autour de la voiture ; au lâcher, l'élan
 *   continue et s'amortit ; après quelques secondes sans geste, la caméra revient doucement à
 *   son balancement automatique, par le chemin le plus court.
 * - Incliner le téléphone décale légèrement la caméra (profondeur), dans des bornes étroites.
 *   L'inclinaison se mesure par rapport à la position de repos, qui suit lentement la main :
 *   tenir le téléphone penché ne décale pas la scène pour toujours, bouger la décale.
 */

import { useRef } from 'react';

export const ORBIT = {
  /** Rotation par pixel glissé : un balayage de l'écran (≈ 360 px) fait un bon demi-tour. */
  radiansPerPixel: 0.009,
  /** Amortissement de l'élan (par seconde). */
  friction: 2.5,
  /** Élan maximal au lâcher (radians par seconde). */
  maxVelocity: 6,
  /** Délai sans geste avant le retour au balancement automatique (secondes). */
  returnDelay: 3,
  /** Vitesse du retour (par seconde). */
  returnRate: 1.2,
  /** Décalage maximal dû à l'inclinaison : angle autour de la voiture et hauteur de caméra. */
  maxTiltAngle: 0.18,
  maxTiltHeight: 0.35,
  /** Lissage du capteur (par seconde) : pas de tremblement de la main à l'écran. */
  tiltSmoothing: 6,
  /** Vitesse à laquelle la position de repos rejoint la main (par seconde). */
  restAdaptation: 0.6,
  /** Amplification de l'écart au repos (une inclinaison de 0,25 g suffit à l'effet maximal). */
  tiltGain: 4,
} as const;

export interface OrbitState {
  /** Décalage d'angle autour de la voiture dû au doigt (radians). */
  offset: number;
  /** Élan en cours (radians par seconde). */
  velocity: number;
  dragging: boolean;
  /** Secondes écoulées depuis le dernier geste. */
  idle: number;
  /** Dernière mesure brute du capteur (gravité en g), `null` avant la première. */
  reading: { x: number; y: number } | null;
  /** Position de repos : la mesure moyenne récente. */
  rest: { x: number; y: number };
  /** Inclinaison lissée, de -1 à 1 sur chaque axe. */
  tilt: { x: number; y: number };
}

export const createOrbit = (): OrbitState => ({
  offset: 0,
  velocity: 0,
  dragging: false,
  idle: 0,
  reading: null,
  rest: { x: 0, y: 0 },
  tilt: { x: 0, y: 0 },
});

/** Un seul objet par écran, conservé entre les rendus. */
export const useOrbit = (): OrbitState => useRef(createOrbit()).current;

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

/** Ramène un angle dans ]-π, π] : le retour prend le chemin le plus court. */
export const wrapAngle = (angle: number): number => {
  const turn = Math.PI * 2;
  const wrapped = ((((angle + Math.PI) % turn) + turn) % turn) - Math.PI;
  return wrapped === -Math.PI ? Math.PI : wrapped;
};

export const startDrag = (state: OrbitState): void => {
  state.dragging = true;
  state.velocity = 0;
  state.idle = 0;
};

/**
 * Le doigt a glissé de `dx` pixels vers la droite : la voiture suit le doigt (sa face visible
 * part vers la droite), donc la caméra tourne dans l'autre sens.
 */
export const dragOrbit = (state: OrbitState, dx: number): void => {
  state.offset -= dx * ORBIT.radiansPerPixel;
  state.idle = 0;
};

/** Lâcher : `vx` est la vitesse du doigt en pixels par milliseconde (PanResponder). */
export const releaseDrag = (state: OrbitState, vx: number): void => {
  state.dragging = false;
  state.idle = 0;
  state.velocity = clamp(-vx * 1000 * ORBIT.radiansPerPixel, -ORBIT.maxVelocity, ORBIT.maxVelocity);
};

/** Nouvelle mesure du capteur (gravité en g) ; la première fixe la position de repos. */
export const setTilt = (state: OrbitState, x: number, y: number): void => {
  if (!state.reading) state.rest = { x, y };
  state.reading = { x, y };
};

/** Le capteur s'arrête (pause, écran quitté) : la scène revient au centre. */
export const clearTilt = (state: OrbitState): void => {
  state.reading = null;
};

/** Avance l'orbite d'une image : élan amorti, retour au repos, lissage de l'inclinaison. */
export const stepOrbit = (state: OrbitState, delta: number): void => {
  let targetX = 0;
  let targetY = 0;
  if (state.reading) {
    const adapt = 1 - Math.exp(-ORBIT.restAdaptation * delta);
    state.rest.x += (state.reading.x - state.rest.x) * adapt;
    state.rest.y += (state.reading.y - state.rest.y) * adapt;
    targetX = clamp((state.reading.x - state.rest.x) * ORBIT.tiltGain, -1, 1);
    targetY = clamp((state.reading.y - state.rest.y) * ORBIT.tiltGain, -1, 1);
  }
  const smoothing = 1 - Math.exp(-ORBIT.tiltSmoothing * delta);
  state.tilt.x += (targetX - state.tilt.x) * smoothing;
  state.tilt.y += (targetY - state.tilt.y) * smoothing;
  if (state.dragging) return;

  state.offset += state.velocity * delta;
  state.velocity *= Math.exp(-ORBIT.friction * delta);
  if (Math.abs(state.velocity) < 1e-3) state.velocity = 0;
  state.idle += delta;

  if (state.idle > ORBIT.returnDelay) {
    state.offset = wrapAngle(state.offset);
    state.offset *= Math.exp(-ORBIT.returnRate * delta);
    if (Math.abs(state.offset) < 1e-4) state.offset = 0;
  }
};

/** Décalage de caméra dû à l'inclinaison : angle autour de la voiture et hauteur. */
export const tiltOffset = (state: OrbitState): { angle: number; height: number } => ({
  angle: state.tilt.x * ORBIT.maxTiltAngle,
  height: -state.tilt.y * ORBIT.maxTiltHeight,
});

/** Un geste horizontal franc revient à la scène ; un geste vertical reste au défilement. */
export const isHorizontalDrag = (dx: number, dy: number): boolean =>
  Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy) * 1.5;
