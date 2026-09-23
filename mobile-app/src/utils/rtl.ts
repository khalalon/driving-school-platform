/**
 * Sens de lecture (D-47, 10.6). Les marges directionnelles passent par `marginStart` /
 * `marginEnd` (React Native les retourne tout seul en RTL) ; restent les **icônes**, qui portent
 * un sens : une flèche « retour » pointe à gauche en français, à droite en arabe.
 *
 * Le sens vient de la **langue choisie** (`i18n`), pas de `I18nManager.isRTL` : après un
 * changement de langue, la constante native peut rester en retard d'un redémarrage.
 */

import type { ComponentProps } from 'react';
import type { Ionicons } from '@expo/vector-icons';
import { isRTL } from '../i18n';

export type IoniconName = ComponentProps<typeof Ionicons>['name'];

/** Icônes dont le sens doit suivre celui de la lecture. */
const MIRRORED: Partial<Record<IoniconName, IoniconName>> = {
  'arrow-back': 'arrow-forward',
  'arrow-forward': 'arrow-back',
  'arrow-back-outline': 'arrow-forward-outline',
  'arrow-forward-outline': 'arrow-back-outline',
  'chevron-back': 'chevron-forward',
  'chevron-forward': 'chevron-back',
  'chevron-back-outline': 'chevron-forward-outline',
  'chevron-forward-outline': 'chevron-back-outline',
};

/** Nom d'icône à utiliser : retourné quand l'application lit de droite à gauche. */
export const mirrorIcon = (name: IoniconName, rtl: boolean = isRTL()): IoniconName =>
  rtl ? (MIRRORED[name] ?? name) : name;
