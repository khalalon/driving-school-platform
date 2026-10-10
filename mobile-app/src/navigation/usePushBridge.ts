/**
 * Le pont entre les notifications et l'app (17.7), monté une fois dans `AppNavigator` :
 *
 * - **après la connexion seulement**, le jeton est enregistré avec la langue courante — et
 *   réenregistré quand la langue change (D-47) ;
 * - toucher une notification ouvre sa destination (`data.screen`), y compris quand l'app était
 *   fermée (dernière réponse lue au démarrage) ;
 * - une destination inconnue ouvre l'écran « Notifications » (`routeForTarget`).
 */

import { useEffect } from 'react';
import { CommonActions, createNavigationContainerRef } from '@react-navigation/native';
import * as Notifications from 'expo-notifications';
import { configureForegroundNotifications, registerForPush, targetOf } from '../services/push';
import { routeForTarget } from './notificationRoutes';
import { User } from '../models/User';
import type { Language } from '../i18n';

/** Référence du conteneur : la navigation depuis un listener, hors de tout écran. */
export const navigationRef = createNavigationContainerRef();

const open = (response: Notifications.NotificationResponse | null, user: User): void => {
  if (!response || !navigationRef.isReady()) {
    return;
  }
  const { name, params } = routeForTarget(targetOf(response), user);
  navigationRef.dispatch(CommonActions.navigate({ name, params }));
};

export function usePushBridge(user: User | null, language: Language): void {
  useEffect(() => {
    configureForegroundNotifications();
  }, []);

  // Jamais au premier lancement : seulement une fois connecté, puis à chaque langue.
  useEffect(() => {
    if (user) {
      void registerForPush(language);
    }
  }, [user?.id, language]);

  useEffect(() => {
    if (!user) {
      return undefined;
    }
    // App fermée : la notification qui l'a ouverte
    Notifications.getLastNotificationResponseAsync()
      .then((response) => open(response, user))
      .catch(() => undefined);
    // App ouverte ou en arrière-plan
    const subscription = Notifications.addNotificationResponseReceivedListener((response) =>
      open(response, user)
    );
    return () => subscription.remove();
  }, [user?.id]);
}
