/**
 * Modèles 3D de l'application (13.9, D-52) : kits Kenney (CC0) préparés par
 * `scripts/prepare_models.py`, inventoriés dans `assets/3d/credits.json`.
 *
 * Aucun modèle ne porte de texture : chaque partie est un matériau uni nommé par son rôle, qu'une
 * scène recolore au rendu selon le thème (`MODEL_MATERIALS`). Un `.glb` est servi par Metro comme
 * une image ; `resolveModelUri` le rend disponible sur le téléphone (expo-asset) avant chargement.
 */

import { Asset } from 'expo-asset';

/* eslint-disable @typescript-eslint/no-require-imports */
export const MODELS = {
  /** Voiture de l'auto-école : accueil (13.10), parcours (13.11). */
  sedan: require('../../../assets/3d/car-sedan.glb'),
  /** Cône de manœuvre : secteurs Manœuvre et Parc. */
  cone: require('../../../assets/3d/cone.glb'),
  trackStraight: require('../../../assets/3d/track-straight.glb'),
  trackCorner: require('../../../assets/3d/track-corner.glb'),
  trackStart: require('../../../assets/3d/track-start.glb'),
  gateLights: require('../../../assets/3d/gate-lights.glb'),
  barrier: require('../../../assets/3d/barrier.glb'),
  lightPost: require('../../../assets/3d/light-post.glb'),
} as const;
/* eslint-enable @typescript-eslint/no-require-imports */

export type ModelKey = keyof typeof MODELS;

/** Matériaux recolorables de chaque modèle (noms posés par `prepare_models.py`). */
export const MODEL_MATERIALS = {
  sedan: ['paint', 'glass', 'dark', 'rim', 'chrome', 'headlight', 'indicator', 'taillight'],
  cone: ['cone', 'stripe'],
  track: ['road', 'grass', 'grey'],
} as const;

/** Chemin local du modèle sur le téléphone, téléchargé depuis Metro au besoin. */
export const resolveModelUri = async (key: ModelKey): Promise<string> => {
  const asset = Asset.fromModule(MODELS[key]);
  if (!asset.localUri) {
    await asset.downloadAsync();
  }
  const uri = asset.localUri ?? asset.uri;
  if (!uri) {
    throw new Error(`Modèle 3D introuvable : ${key}`);
  }
  return uri;
};
