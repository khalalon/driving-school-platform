/**
 * Logique du parcours 3D (13.11, D-52 ; caméra qui suit la voiture 13b.5, D-53), sans three.js :
 * le circuit ovale vu du ciel, ses cinq secteurs (ordre D-45) et leur état, tirés de
 * `buildJourney` — rien n'est recalculé ici — puis le trajet de la voiture et la caméra.
 *
 * - fait → jaune signal ; en cours → turquoise télémétrie ; à venir → piste éteinte.
 *   Une étape « commencée » sans être l'étape courante reste éteinte, mais son détail le dit.
 * - À l'ouverture, la voiture part de la ligne de départ et roule jusqu'au secteur en cours (la
 *   ligne d'arrivée quand tout est conclu) ; la caméra la suit, puis remonte en vue d'ensemble.
 *   Choisir une étape déplace la caméra au-dessus de son secteur.
 */

import type { Theme } from '../../theme';
import type { JourneyStep, JourneyStepKey } from '../../models/Journey';
import type { Sector, SectorState } from '../circuit/SectorBar';
import { t } from '../../i18n';

/** Circuit en « stade » : deux lignes droites reliées par deux demi-cercles. */
export const TRACK = { straight: 5, radius: 2.2, width: 0.9 } as const;
/** Jour entre deux secteurs, en fraction du tour. */
export const SECTOR_GAP = 0.012;

export const PERIMETER = 2 * TRACK.straight + 2 * Math.PI * TRACK.radius;

export interface TrackPoint {
  x: number;
  z: number;
}

/**
 * Point du circuit à la fraction `u` du tour (0 = ligne de départ, en bas à gauche), parcouru
 * dans le sens inverse des aiguilles d'une montre vu du dessus.
 */
export const stadiumPoint = (u: number): TrackPoint => {
  const { straight: L, radius: R } = TRACK;
  const s = (((u % 1) + 1) % 1) * PERIMETER;
  if (s < L) return { x: -L / 2 + s, z: R };
  if (s < L + Math.PI * R) {
    const theta = Math.PI / 2 - (s - L) / R;
    return { x: L / 2 + R * Math.cos(theta), z: R * Math.sin(theta) };
  }
  if (s < 2 * L + Math.PI * R) return { x: L / 2 - (s - L - Math.PI * R), z: -R };
  const theta = -Math.PI / 2 - (s - 2 * L - Math.PI * R) / R;
  return { x: -L / 2 + R * Math.cos(theta), z: R * Math.sin(theta) };
};

/** Cap (rotation autour de l'axe vertical) d'un objet qui roule vers l'avant en `u`. */
export const stadiumHeading = (u: number): number => {
  const a = stadiumPoint(u);
  const b = stadiumPoint(u + 0.001);
  return Math.atan2(b.x - a.x, b.z - a.z);
};

/** Fractions de tour [début, fin] du secteur `index` sur `count`, avec un jour entre secteurs. */
export const sectorRange = (index: number, count: number): [number, number] => [
  index / count + SECTOR_GAP / 2,
  (index + 1) / count - SECTOR_GAP / 2,
];

/** État d'affichage d'une étape du parcours. */
export const sectorState = (step: JourneyStep): SectorState =>
  step.state === 'done' ? 'done' : step.state === 'current' ? 'current' : 'todo';

const STATE_LABELS: Record<SectorState, () => string> = {
  done: () => t('journey.state.done'),
  current: () => t('journey.state.current'),
  todo: () => t('journey.state.todo'),
};

/** Les secteurs de la barre et du circuit, annoncés avec leur état et leur détail. */
export const journeySectors = (steps: JourneyStep[]): (Sector & { key: JourneyStepKey })[] =>
  steps.map((step) => {
    const state = sectorState(step);
    return {
      key: step.key,
      label: step.title,
      state,
      accessibilityLabel: `${step.title}, ${STATE_LABELS[state]()} — ${step.detail}`,
    };
  });

/** Secteur où pose la voiture : l'étape en cours, sinon la ligne d'arrivée (tout est conclu). */
export const carSectorIndex = (steps: JourneyStep[]): number | null => {
  const index = steps.findIndex((step) => step.state === 'current');
  return index >= 0 ? index : null;
};

export interface JourneyTrackPalette {
  background: string;
  ground: string;
  kerb: string;
  done: string;
  current: string;
  todo: string;
  car: string;
  /** Toit, vitres, pneus : la teinte sombre de la voiture. */
  glass: string;
  chrome: string;
  headlight: string;
  cone: string;
  night: boolean;
}

export const journeyTrackPalette = (theme: Theme): JourneyTrackPalette => {
  const { colors } = theme;
  const night = theme.name === 'dark';
  return {
    background: colors.surfaceRaised,
    ground: night ? colors.surface : colors.surfaceMuted,
    kerb: colors.border,
    done: colors.gauge,
    current: colors.telemetry,
    todo: colors.gaugeTrack,
    car: night ? colors.textPrimary : colors.signal,
    glass: colors.surface,
    chrome: colors.textSecondary,
    // Blanc craie : `signalSoft` est un fond sombre en thème sombre (même piège que l'accueil)
    headlight: night ? colors.textPrimary : colors.surfaceRaised,
    cone: colors.warning,
    night,
  };
};

/** Trajet d'ouverture (secondes) : la voiture roule, puis la caméra remonte. */
export const DRIVE = { duration: 3.2, rise: 1.6 } as const;

const easeInOut = (x: number): number => {
  const t = Math.min(Math.max(x, 0), 1);
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
};

const smoothstep = (edge0: number, edge1: number, x: number): number => {
  const t = Math.min(Math.max((x - edge0) / (edge1 - edge0), 0), 1);
  return t * t * (3 - 2 * t);
};

/**
 * Fraction de tour où la voiture se gare : le milieu du secteur en cours, ou un tour complet
 * (la ligne d'arrivée) quand tout est conclu.
 */
export const parkingU = (carSector: number | null, count: number): number => {
  if (carSector === null) return 1;
  const [from, to] = sectorRange(carSector, count);
  return (from + to) / 2;
};

/** Position de la voiture (fraction de tour) `elapsed` secondes après l'ouverture. */
export const driveU = (elapsed: number, target: number): number =>
  target * easeInOut(elapsed / DRIVE.duration);

export interface CameraPose {
  position: [number, number, number];
  look: [number, number, number];
}

/** Vue d'ensemble du circuit, légèrement inclinée, qui oscille à peine. */
export const overviewPose = (elapsed: number): CameraPose => ({
  position: [Math.sin(elapsed * 0.15) * 0.8, 8.6, 6.4],
  look: [0, 0, 0.3],
});

/** Caméra de poursuite : derrière la voiture, au-dessus, visant devant elle. */
export const chasePose = (u: number): CameraPose => {
  const p = stadiumPoint(u);
  const heading = stadiumHeading(u);
  const dx = Math.sin(heading);
  const dz = Math.cos(heading);
  return {
    position: [p.x - dx * 1.9, 0.95, p.z - dz * 1.9],
    look: [p.x + dx * 1.4, 0.1, p.z + dz * 1.4],
  };
};

/**
 * Vue d'un secteur choisi : en hauteur, reculée vers l'extérieur de la piste et vers le bas de
 * l'écran, pour montrer le secteur entre ses deux voisins.
 */
export const sectorPose = (index: number, count: number): CameraPose => {
  const [from, to] = sectorRange(index, count);
  const p = stadiumPoint((from + to) / 2);
  const out = Math.hypot(p.x, p.z) || 1;
  return {
    position: [p.x * 0.4 + (p.x / out) * 1.5, 5.2, p.z * 0.4 + (p.z / out) * 1.5 + 3.4],
    look: [p.x, 0, p.z],
  };
};

const mixPose = (a: CameraPose, b: CameraPose, w: number): CameraPose => {
  const mix = (x: number, y: number) => x + (y - x) * w;
  return {
    position: [mix(a.position[0], b.position[0]), mix(a.position[1], b.position[1]), mix(a.position[2], b.position[2])],
    look: [mix(a.look[0], b.look[0]), mix(a.look[1], b.look[1]), mix(a.look[2], b.look[2])],
  };
};

/**
 * Où la caméra veut être : elle suit la voiture pendant le trajet, puis remonte vers la vue
 * d'ensemble — ou vers le secteur choisi s'il y en a un. La scène y glisse en douceur.
 */
export const journeyCamera = (
  elapsed: number,
  target: number,
  selected: number | null,
  count: number
): CameraPose => {
  const chase = chasePose(driveU(elapsed, target));
  const rest = selected === null ? overviewPose(elapsed) : sectorPose(selected, count);
  return mixPose(chase, rest, smoothstep(DRIVE.duration, DRIVE.duration + DRIVE.rise, elapsed));
};
