/**
 * Rôles typographiques « Circuit » (D-52). Un texte choisit un **rôle** (`title`, `label`,
 * `numeric`…), jamais une police : la famille dépend de la langue.
 *
 * - En français : Barlow Condensed pour ce qui se lit d'un coup d'œil (titres, libellés en
 *   capitales, chiffres), Barlow pour le texte courant.
 * - En arabe (D-47) : Cairo partout, **sans capitales ni espacement de lettres** — l'écriture
 *   arabe n'a pas de majuscules et l'espacement casse la liaison des lettres —, avec un
 *   interlignage plus haut pour les hampes de Cairo. Les chiffres (`numeric`) restent en Barlow
 *   Condensed : l'application affiche des chiffres latins dans les deux langues.
 */

import type { TextStyle } from 'react-native';
import type { Language } from '../i18n';
import { fontFamilies } from './fonts';

export type TextRole =
  | 'display'
  | 'title'
  | 'heading'
  | 'label'
  | 'body'
  | 'bodyStrong'
  | 'caption'
  | 'numeric';

type Weight = 'regular' | 'medium' | 'semibold' | 'bold';

interface RoleSpec {
  /** Famille latine : condensée (lecture d'un coup d'œil) ou texte courant. */
  latin: 'condensed' | 'sans';
  weight: Weight;
  fontSize: number;
  lineHeight: number;
  uppercase?: boolean;
  letterSpacing?: number;
  tabular?: boolean;
}

/** L'échelle : une taille et une graisse par usage. */
export const TEXT_ROLES: Record<TextRole, RoleSpec> = {
  display: { latin: 'condensed', weight: 'bold', fontSize: 36, lineHeight: 38, uppercase: true, letterSpacing: 0.5 },
  title: { latin: 'condensed', weight: 'bold', fontSize: 28, lineHeight: 30, uppercase: true, letterSpacing: 0.3 },
  heading: { latin: 'condensed', weight: 'semibold', fontSize: 20, lineHeight: 24 },
  label: { latin: 'condensed', weight: 'bold', fontSize: 13, lineHeight: 16, uppercase: true, letterSpacing: 1.8 },
  body: { latin: 'sans', weight: 'regular', fontSize: 16, lineHeight: 24 },
  bodyStrong: { latin: 'sans', weight: 'semibold', fontSize: 16, lineHeight: 24 },
  caption: { latin: 'sans', weight: 'medium', fontSize: 13, lineHeight: 18 },
  numeric: { latin: 'condensed', weight: 'bold', fontSize: 44, lineHeight: 46, tabular: true },
};

/** Interlignage minimal de Cairo, relatif à la taille : ses hampes dépassent celles de Barlow. */
const ARABIC_LINE_HEIGHT = 1.5;

const latinFamily = (spec: RoleSpec): string => {
  if (spec.latin === 'sans') {
    return fontFamilies.sans[spec.weight];
  }
  // Barlow Condensed n'est embarquée qu'en medium / semibold / bold
  return fontFamilies.condensed[spec.weight === 'regular' ? 'medium' : spec.weight];
};

/** Style complet d'un rôle dans une langue. Fonction pure : utilisable hors composant. */
export const textStyle = (role: TextRole, language: Language): TextStyle => {
  const spec = TEXT_ROLES[role];
  const style: TextStyle = { fontSize: spec.fontSize };

  if (spec.tabular) {
    style.fontVariant = ['tabular-nums'];
  }

  if (language === 'ar' && !spec.tabular) {
    style.fontFamily = fontFamilies.arabic[spec.weight];
    style.lineHeight = Math.max(spec.lineHeight, Math.round(spec.fontSize * ARABIC_LINE_HEIGHT));
    style.textTransform = 'none';
    style.letterSpacing = 0;
    return style;
  }

  style.fontFamily = latinFamily(spec);
  style.lineHeight = spec.lineHeight;
  if (spec.uppercase) {
    style.textTransform = 'uppercase';
  }
  if (spec.letterSpacing) {
    style.letterSpacing = spec.letterSpacing;
  }
  return style;
};
