/**
 * Compatibilité du contexte `expo-gl` avec three.js (correctif du 11/10/2026).
 *
 * Constaté sur le téléphone Android de l'auteur, build de développement (17.1) : au démarrage du
 * rendu, three.js interroge `gl.getShaderPrecisionFormat(...)` pour choisir la précision des
 * shaders, et lit `.precision` sur la réponse. `expo-gl` 57 a bien la méthode, mais sur cet
 * appareil elle renvoie `undefined` : `THREE.WebGLRenderer: Cannot read property 'precision' of
 * undefined`, la scène tombe et `Scene3D` affiche l'image fixe.
 *
 * Le correctif ne touche qu'à cette méthode, et seulement quand sa réponse est vide : on rend
 * alors la valeur d'un `highp float` en OpenGL ES (`rangeMin` / `rangeMax` 127, précision 23),
 * ce que tous les GPU mobiles actuels fournissent. Une réponse réelle passe telle quelle.
 */

/** `highp float` d'OpenGL ES 3 : la réponse d'un GPU mobile actuel. */
export const HIGHP_FLOAT_FORMAT = { rangeMin: 127, rangeMax: 127, precision: 23 } as const;

type PrecisionFormat = { rangeMin: number; rangeMax: number; precision: number };

/** Ce que le correctif utilise du contexte : seulement cette méthode. */
interface PrecisionQueryable {
  getShaderPrecisionFormat(shaderType: number, precisionType: number): PrecisionFormat | null;
}

const GUARDED = '__precisionFormatGuarded';

/**
 * Enveloppe `getShaderPrecisionFormat` du contexte pour qu'elle ne renvoie jamais de réponse
 * vide. Sans effet si la méthode manque ; jamais appliqué deux fois au même contexte (une scène
 * recréée réutilise parfois le contexte).
 */
export function guardPrecisionFormat(context: unknown): void {
  const gl = context as (PrecisionQueryable & Record<string, unknown>) | null;
  if (!gl || typeof gl.getShaderPrecisionFormat !== 'function' || gl[GUARDED]) {
    return;
  }
  const original = gl.getShaderPrecisionFormat.bind(gl);
  gl.getShaderPrecisionFormat = (shaderType: number, precisionType: number) =>
    original(shaderType, precisionType) ?? { ...HIGHP_FLOAT_FORMAT };
  gl[GUARDED] = true;
}
