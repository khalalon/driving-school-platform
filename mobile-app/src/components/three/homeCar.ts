/**
 * Logique de la scène d'accueil (13.10, D-52 ; 13b.2, D-53), sans three.js : couleurs tirées du
 * thème, chronologie de l'arrivée de la voiture et intensité des feux stop. Séparée de la scène
 * pour être testée sans GL.
 *
 * - Thème sombre : **de nuit** — fond asphalte, brouillard, phares jaunes avec faisceaux,
 *   lampadaires et marquage au sol qui défilent.
 * - Thème clair : **de jour** — fond clair, pas de faisceau, phares à peine allumés.
 */

import type { Theme } from '../../theme';

export interface HomeCarPalette {
  mode: 'night' | 'day';
  background: string;
  ground: string;
  road: string;
  kerb: string;
  line: string;
  paint: string;
  /** Toit, bas de caisse, rétroviseurs : la seconde teinte de la carrosserie. */
  paintAccent: string;
  glass: string;
  trim: string;
  tyre: string;
  headlight: string;
  beam: string;
  taillight: string;
  post: string;
  /** Feu tricolore (13b.3) : boîtier, feux allumés, feu éteint, ligne d'arrêt. */
  signalHousing: string;
  signalRed: string;
  signalOrange: string;
  signalGreen: string;
  signalOff: string;
  stopLine: string;
  /** Intensité d'un feu allumé ; halo coloré qu'il projette sur la voiture. */
  signalGlow: number;
  signalHalo: number;
  /** Jantes polies, rétroviseurs. */
  chrome: string;
  /** Ombre de contact sous la voiture. */
  shadow: string;
  shadowOpacity: number;
  ambient: string;
  ambientIntensity: number;
  keyIntensity: number;
  /** Force des reflets d'environnement sur la carrosserie vernie. */
  envIntensity: number;
  /** Intensité lumineuse des phares (matériau émissif et faisceaux). */
  headlightIntensity: number;
  /** Intensité des feux arrière au repos, et en plus au freinage maximal. */
  taillightIntensity: number;
  brakeBoost: number;
  fogNear: number;
  fogFar: number;
}

export const homeCarPalette = (theme: Theme): HomeCarPalette => {
  const { colors } = theme;
  const night = theme.name === 'dark';
  return {
    mode: night ? 'night' : 'day',
    background: night ? colors.surface : colors.surfaceRaised,
    ground: night ? colors.surface : colors.surfaceMuted,
    road: night ? colors.surfaceRaised : colors.textSecondary,
    kerb: night ? colors.textMuted : colors.surfaceRaised,
    line: colors.signal,
    // La voiture de l'auto-école : graphite de nuit, jaune signal de jour (visible sur fond clair)
    paint: night ? colors.gaugeTrack : colors.signal,
    paintAccent: night ? colors.surface : colors.textPrimary,
    glass: night ? colors.surface : colors.textPrimary,
    trim: colors.textSecondary,
    tyre: night ? colors.surface : colors.textPrimary,
    // Blanc craie : `signalSoft` est un fond sombre en thème sombre, les phares n'éclairaient plus
    headlight: night ? colors.textPrimary : colors.surfaceRaised,
    beam: colors.signal,
    taillight: colors.danger,
    post: night ? colors.border : colors.borderStrong,
    signalHousing: night ? colors.surfaceRaised : colors.textPrimary,
    signalRed: colors.danger,
    signalOrange: colors.warning,
    signalGreen: colors.success,
    signalOff: night ? colors.surfaceMuted : colors.textSecondary,
    stopLine: night ? colors.textPrimary : colors.surfaceRaised,
    signalGlow: night ? 2.6 : 1.4,
    signalHalo: night ? 3 : 0.8,
    chrome: colors.textSecondary,
    shadow: theme.shadows.lg.shadowColor,
    shadowOpacity: night ? 0.8 : 0.45,
    ambient: night ? colors.textMuted : colors.surfaceRaised,
    ambientIntensity: night ? 0.35 : 1.1,
    keyIntensity: night ? 0.6 : 1.6,
    envIntensity: night ? 0.3 : 0.9,
    headlightIntensity: night ? 2.6 : 0.4,
    taillightIntensity: night ? 1.2 : 0.3,
    brakeBoost: night ? 2.4 : 1.6,
    fogNear: night ? 6 : 10,
    fogFar: night ? 18 : 30,
  };
};

/** Durée de l'arrivée de la voiture, en secondes. */
export const INTRO_DURATION = 1.8;
/** Distance parcourue pendant l'arrivée : la voiture sort de l'obscurité. */
export const INTRO_DISTANCE = 10;
/** Vitesse de croisière du décor qui défile ensuite (unités par seconde). */
export const CRUISE_SPEED = 4;

export const easeOutCubic = (x: number): number => 1 - Math.pow(1 - Math.min(Math.max(x, 0), 1), 3);

export interface IntroState {
  carZ: number;
  /** Vitesse du décor qui défile. */
  speed: number;
  /** Vitesse de la voiture par rapport à la route : celle qui fait tourner les roues. */
  groundSpeed: number;
  done: boolean;
}

/**
 * Position de la voiture et vitesse du décor à l'instant `elapsed` : la voiture arrive en
 * ralentissant jusqu'à sa place (z = 0), puis c'est le décor qui défile à vitesse constante —
 * la voiture « roule » sans quitter le cadre. Par rapport à la route, elle freine donc pendant
 * toute l'arrivée : de sa vitesse d'entrée jusqu'à la vitesse de croisière.
 */
export const introState = (elapsed: number): IntroState => {
  const progress = Math.min(Math.max(elapsed, 0) / INTRO_DURATION, 1);
  const carZ = -INTRO_DISTANCE * (1 - easeOutCubic(progress));
  // Pendant l'arrivée, le décor accélère jusqu'à la vitesse de croisière
  const speed = CRUISE_SPEED * easeOutCubic(progress);
  // Dérivée de carZ : vitesse propre de la voiture dans le cadre
  const carSpeed = (INTRO_DISTANCE * 3 * Math.pow(1 - progress, 2)) / INTRO_DURATION;
  return { carZ, speed, groundSpeed: carSpeed + speed, done: progress >= 1 };
};

/** Décélération (unités/s²) qui allume les feux stop à pleine intensité. */
export const FULL_BRAKE = 6;

/**
 * Freinage de 0 à 1 d'après la variation de vitesse sur la route entre deux images : 0 quand la
 * voiture accélère ou roule à vitesse constante, 1 dès `FULL_BRAKE`.
 */
export const brakeLevel = (previousSpeed: number, speed: number, delta: number): number => {
  if (delta <= 0) return 0;
  const deceleration = (previousSpeed - speed) / delta;
  return Math.min(Math.max(deceleration / FULL_BRAKE, 0), 1);
};

/** Rayon des roues de `car.glb` (moyeu à y = 0,229, pneu posé sur y = 0). */
export const WHEEL_RADIUS = 0.229;

/** Rotation des roues (radians) pour `distance` parcourue : elles roulent sans glisser. */
export const wheelTurn = (distance: number): number => distance / WHEEL_RADIUS;

/**
 * Décalage d'un élément répété (tirets, lampadaires) qui défile en boucle sur `span` unités.
 * La voiture regarde vers +z (roues avant du modèle à z > 0) : quand elle avance, le décor
 * doit glisser vers -z, de l'avant vers l'arrière — sinon elle semble rouler en marche arrière.
 */
export const scrollOffset = (base: number, travelled: number, span: number): number => {
  const z = (base - travelled) % span;
  return z < 0 ? z + span : z;
};

/**
 * Feu tricolore de l'accueil (13b.3, D-53). Après l'arrivée, la scène tourne en cycle :
 * croisière, le feu passe à l'orange puis au rouge, la voiture freine et s'arrête juste avant la
 * ligne, le rouge tient, le feu passe au vert, la voiture repart et le feu s'éloigne derrière
 * elle, puis un nouveau feu arrive. Durées en secondes ; les distances en découlent.
 */
export const TRAFFIC = {
  cruiseBefore: 4,
  brake: 2,
  stop: 2.5,
  accelerate: 2.5,
  cruiseAfter: 5,
  /** Le feu passe à l'orange un peu avant le début du freinage… */
  orangeLead: 0.6,
  /** … et au rouge un peu après : la voiture freine déjà. */
  redAfter: 0.8,
  /** Écart entre le nez de la voiture arrêtée et la ligne d'arrêt. */
  stopGap: 0.4,
} as const;

export const TRAFFIC_CYCLE =
  TRAFFIC.cruiseBefore + TRAFFIC.brake + TRAFFIC.stop + TRAFFIC.accelerate + TRAFFIC.cruiseAfter;

export type SignalColor = 'green' | 'orange' | 'red';

export interface TrafficState {
  /** Vitesse de la voiture sur la route (= vitesse de défilement du décor). */
  speed: number;
  /** Distance du nez de la voiture à la ligne d'arrêt ; négative une fois la ligne passée. */
  lightDistance: number;
  signal: SignalColor;
  /** 1 pendant le freinage et à l'arrêt (pied sur le frein au rouge), 0 sinon. */
  braking: number;
}

/** État du cycle `t` secondes après la fin de l'arrivée (le cycle se répète). */
export const trafficState = (t: number): TrafficState => {
  const V = CRUISE_SPEED;
  const { cruiseBefore, brake, stop, accelerate, orangeLead, redAfter, stopGap } = TRAFFIC;
  const brakeDistance = (V * brake) / 2;
  const startDistance = stopGap + brakeDistance + V * cruiseBefore;
  const u = ((t % TRAFFIC_CYCLE) + TRAFFIC_CYCLE) % TRAFFIC_CYCLE;

  const endBrake = cruiseBefore + brake;
  const endStop = endBrake + stop;
  const endAccelerate = endStop + accelerate;
  const stoppedAt = V * cruiseBefore + brakeDistance;

  let speed: number;
  let travelled: number;
  if (u < cruiseBefore) {
    speed = V;
    travelled = V * u;
  } else if (u < endBrake) {
    const x = u - cruiseBefore;
    speed = V * (1 - x / brake);
    travelled = V * cruiseBefore + V * x - (V * x * x) / (2 * brake);
  } else if (u < endStop) {
    speed = 0;
    travelled = stoppedAt;
  } else if (u < endAccelerate) {
    const x = u - endStop;
    speed = (V * x) / accelerate;
    travelled = stoppedAt + (V * x * x) / (2 * accelerate);
  } else {
    speed = V;
    travelled = stoppedAt + (V * accelerate) / 2 + V * (u - endAccelerate);
  }

  let signal: SignalColor = 'green';
  if (u >= cruiseBefore - orangeLead && u < cruiseBefore + redAfter) signal = 'orange';
  else if (u >= cruiseBefore + redAfter && u < endStop) signal = 'red';

  const braking = u >= cruiseBefore && u < endStop ? 1 : 0;
  return { speed, lightDistance: startDistance - travelled, signal, braking };
};

const smoothstep = (edge0: number, edge1: number, x: number): number => {
  const t = Math.min(Math.max((x - edge0) / (edge1 - edge0), 0), 1);
  return t * t * (3 - 2 * t);
};

/**
 * Poids du plan large (0 à 1) selon la distance du feu : la tête du feu, proche de la caméra
 * quand la voiture s'arrête, sortirait du cadre par le haut. Le plan s'élargit pendant que le
 * feu approche et revient une fois le feu passé derrière la voiture.
 */
export const signalFocus = (lightDistance: number): number =>
  smoothstep(12, 6, lightDistance) * smoothstep(-10, -4, lightDistance);

export interface CameraRig {
  /** Angle autour de la voiture (0 = plein avant, vers +z ; positif = côté gauche de la voiture). */
  angle: number;
  distance: number;
  height: number;
  /** Hauteur du point visé sur l'axe de la voiture. */
  lookY: number;
}

const CLOSE = { distance: 5.2, height: 1.7, lookY: 0.4 };
const WIDE = { distance: 6.8, height: 2, lookY: 1 };

/** Caméra de l'accueil : trois-quarts avant qui oscille lentement, élargie près du feu. */
export const cameraRig = (elapsed: number, lightDistance: number): CameraRig => {
  const focus = signalFocus(lightDistance);
  const mix = (a: number, b: number) => a + (b - a) * focus;
  return {
    angle: 0.6 + Math.sin(elapsed * 0.2) * 0.45,
    distance: mix(CLOSE.distance, WIDE.distance),
    height: mix(CLOSE.height, WIDE.height),
    lookY: mix(CLOSE.lookY, WIDE.lookY),
  };
};
