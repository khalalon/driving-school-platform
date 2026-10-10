/**
 * Notifications push côté appareil (17.7, D-63, D-67).
 *
 * Trois règles :
 * - **la permission n'est demandée qu'après la connexion**, jamais au premier lancement : une
 *   demande sans contexte se refuse, et un refus Android est définitif ;
 * - **le jeton part avec la langue courante** (D-47) et repart quand elle change : c'est le
 *   serveur qui rend le texte, dans la langue de l'appareil ;
 * - **rien ici ne fait échouer la connexion** : Expo Go sur Android (depuis le SDK 53), un
 *   projet sans `extra.eas.projectId` (avant `eas init`, 17.1), une permission refusée ou un
 *   réseau absent font simplement renvoyer `null`.
 */

import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { notificationService } from './api/NotificationService';
import { NotificationTarget, PushPlatform } from '../models/Notification';
import type { Language } from '../i18n';

/** Jeton enregistré sur ce téléphone : il faut le connaître pour le retirer au logout (N2). */
export const PUSH_TOKEN_KEY = 'push_token';
const ANDROID_CHANNEL = 'default';

/** L'appli au premier plan affiche quand même la notification (sinon elle passerait inaperçue). */
export function configureForegroundNotifications(): void {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
}

/** Identifiant du projet chez Expo, écrit par `eas init` (17.1) ; sans lui, pas de jeton. */
const projectId = (): string | undefined => {
  const extra = Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined;
  return extra?.eas?.projectId ?? Constants.easConfig?.projectId;
};

/**
 * Demande la permission si besoin, obtient le jeton Expo et l'envoie avec la langue (N1).
 * Renvoie le jeton, ou `null` sans jamais lever.
 */
export async function registerForPush(language: Language): Promise<string | null> {
  try {
    const id = projectId();
    if (!id) {
      // Avant `eas init` : aucun jeton possible. Le reste de l'app fonctionne normalement.
      return null;
    }

    let { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') {
      ({ status } = await Notifications.requestPermissionsAsync());
    }
    if (status !== 'granted') {
      return null;
    }

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL, {
        name: 'Auto-école',
        importance: Notifications.AndroidImportance.HIGH,
      });
    }

    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId: id });
    await notificationService.registerPushToken({
      token,
      platform: (Platform.OS === 'ios' ? 'ios' : 'android') as PushPlatform,
      language: language === 'ar' ? 'ar' : 'fr',
    });
    await AsyncStorage.setItem(PUSH_TOKEN_KEY, token);
    return token;
  } catch (error) {
    console.warn('Push : enregistrement impossible', error);
    return null;
  }
}

/**
 * Au logout (N2), **avant** la révocation de la session : le serveur exige un appelant connecté.
 * Toujours silencieux — une déconnexion ne doit jamais échouer à cause d'une notification.
 */
export async function unregisterPush(): Promise<void> {
  try {
    const token = await AsyncStorage.getItem(PUSH_TOKEN_KEY);
    if (token) {
      await notificationService.removePushToken(token);
    }
  } catch (error) {
    console.warn('Push : retrait du jeton impossible', error);
  } finally {
    await AsyncStorage.removeItem(PUSH_TOKEN_KEY).catch(() => undefined);
  }
}

/** La destination portée par une notification touchée, si elle en a une. */
export function targetOf(response: Notifications.NotificationResponse | null): NotificationTarget | null {
  const data = response?.notification.request.content.data as
    | { screen?: unknown; id?: unknown }
    | undefined;
  if (!data || typeof data.screen !== 'string') {
    return null;
  }
  return { screen: data.screen, id: typeof data.id === 'string' ? data.id : undefined };
}
