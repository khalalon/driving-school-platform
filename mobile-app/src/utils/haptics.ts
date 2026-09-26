/**
 * Retour haptique (13.4, D-52), réservé aux moments qui le méritent : une demande envoyée, une
 * présence notée, une célébration (`success`) ; un choix dans une liste (`selection`) ; une
 * action refusée (`warning`). Jamais sur chaque appui.
 *
 * Une vibration qui échoue (appareil sans moteur, web) ne doit jamais casser l'action : chaque
 * appel avale son erreur.
 */

import * as Haptics from 'expo-haptics';

const quietly = (run: () => Promise<void>): void => {
  run().catch(() => undefined);
};

export const haptics = {
  success: (): void =>
    quietly(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  warning: (): void =>
    quietly(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)),
  selection: (): void => quietly(() => Haptics.selectionAsync()),
};
