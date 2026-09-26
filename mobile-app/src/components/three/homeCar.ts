/**
 * Logique de la scène d'accueil (13.10, D-52), sans three.js : couleurs tirées du thème et
 * chronologie de l'arrivée de la voiture. Séparée de la scène pour être testée sans GL.
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
  glass: string;
  trim: string;
  tyre: string;
  headlight: string;
  beam: string;
  taillight: string;
  post: string;
  ambient: string;
  ambientIntensity: number;
  keyIntensity: number;
  /** Intensité lumineuse des phares (matériau émissif et faisceaux). */
  headlightIntensity: number;
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
    glass: night ? colors.surface : colors.textPrimary,
    trim: colors.textSecondary,
    tyre: night ? colors.surface : colors.textPrimary,
    headlight: night ? colors.signalSoft : colors.surfaceRaised,
    beam: colors.signal,
    taillight: colors.danger,
    post: night ? colors.border : colors.borderStrong,
    ambient: night ? colors.textMuted : colors.surfaceRaised,
    ambientIntensity: night ? 0.35 : 1.1,
    keyIntensity: night ? 0.6 : 1.6,
    headlightIntensity: night ? 2.6 : 0.4,
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

/**
 * Position de la voiture et vitesse du décor à l'instant `elapsed` : la voiture arrive en
 * ralentissant jusqu'à sa place (z = 0), puis c'est le décor qui défile à vitesse constante —
 * la voiture « roule » sans quitter le cadre.
 */
export const introState = (elapsed: number): { carZ: number; speed: number; done: boolean } => {
  const progress = Math.min(elapsed / INTRO_DURATION, 1);
  const carZ = -INTRO_DISTANCE * (1 - easeOutCubic(progress));
  // Pendant l'arrivée, le décor accélère jusqu'à la vitesse de croisière
  const speed = CRUISE_SPEED * easeOutCubic(progress);
  return { carZ, speed, done: progress >= 1 };
};

/** Décalage d'un élément répété (tirets, lampadaires) qui défile en boucle sur `span` unités. */
export const scrollOffset = (base: number, travelled: number, span: number): number => {
  const z = (base + travelled) % span;
  return z < 0 ? z + span : z;
};
