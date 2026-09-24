/**
 * Intentions de couleur partagées par `Chip`, `Badge`, `Toast` et `EmptyState` (11.2).
 * Un statut choisit une **intention** (`success`, `danger`…), jamais une couleur : le thème
 * décide du rendu, et le contraste des paires `soft` / `text` est vérifié par le test de 11.1.
 */

import { Theme } from '../../theme';

export type Tone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger';

export interface ToneColors {
  /** Fond pâle, pour une pastille posée sur une carte. */
  soft: string;
  /** Texte lisible sur `soft`. */
  text: string;
  /** Aplat vif, pour un point d'état ou une barre. */
  solid: string;
}

export const toneColors = (theme: Theme, tone: Tone): ToneColors => {
  const { colors } = theme;
  switch (tone) {
    case 'accent':
      return { soft: colors.accentSoft, text: colors.accentText, solid: colors.accent };
    case 'success':
      return { soft: colors.successSoft, text: colors.successText, solid: colors.success };
    case 'warning':
      return { soft: colors.warningSoft, text: colors.warningText, solid: colors.warning };
    case 'danger':
      return { soft: colors.dangerSoft, text: colors.dangerText, solid: colors.danger };
    case 'neutral':
      return { soft: colors.surfaceMuted, text: colors.textSecondary, solid: colors.borderStrong };
  }
};
