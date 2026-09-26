/**
 * Logique du parcours 3D (13.11, D-52), sans three.js : le circuit ovale vu du ciel, ses cinq
 * secteurs (ordre D-45) et leur état, tirés de `buildJourney` — rien n'est recalculé ici.
 *
 * - fait → jaune signal ; en cours → turquoise télémétrie ; à venir → piste éteinte.
 *   Une étape « commencée » sans être l'étape courante reste éteinte, mais son détail le dit.
 * - La voiture roule sur le secteur en cours (sur la ligne d'arrivée quand tout est conclu).
 */

import type { Theme } from '../../theme';
import type { JourneyStep, JourneyStepKey } from '../../models/Journey';
import type { Sector, SectorState } from '../circuit/SectorBar';
import { t } from '../../i18n';

/** Circuit en « stade » : deux lignes droites reliées par deux demi-cercles. */
export const TRACK = { straight: 5, radius: 2.2, width: 0.9 } as const;
/** Jour entre deux secteurs, en fraction du tour. */
export const SECTOR_GAP = 0.012;

const PERIMETER = 2 * TRACK.straight + 2 * Math.PI * TRACK.radius;

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
  glass: string;
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
    headlight: colors.signalSoft,
    cone: colors.warning,
    night,
  };
};
