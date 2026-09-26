/**
 * Fichiers des polices (13.2, D-52), chargés une fois au démarrage par `useFonts` (App.tsx).
 * Seules les graisses utilisées sont embarquées : chaque import vise le sous-dossier d'une
 * graisse, pas l'index du paquet qui les chargerait toutes.
 */

import { BarlowCondensed_500Medium } from '@expo-google-fonts/barlow-condensed/500Medium';
import { BarlowCondensed_600SemiBold } from '@expo-google-fonts/barlow-condensed/600SemiBold';
import { BarlowCondensed_700Bold } from '@expo-google-fonts/barlow-condensed/700Bold';
import { Barlow_400Regular } from '@expo-google-fonts/barlow/400Regular';
import { Barlow_500Medium } from '@expo-google-fonts/barlow/500Medium';
import { Barlow_600SemiBold } from '@expo-google-fonts/barlow/600SemiBold';
import { Barlow_700Bold } from '@expo-google-fonts/barlow/700Bold';
import { Cairo_400Regular } from '@expo-google-fonts/cairo/400Regular';
import { Cairo_500Medium } from '@expo-google-fonts/cairo/500Medium';
import { Cairo_600SemiBold } from '@expo-google-fonts/cairo/600SemiBold';
import { Cairo_700Bold } from '@expo-google-fonts/cairo/700Bold';
import { fontFamilies } from './fonts';

/** À passer à `useFonts` au démarrage (App.tsx). */
export const FONT_ASSETS = {
  [fontFamilies.condensed.medium]: BarlowCondensed_500Medium,
  [fontFamilies.condensed.semibold]: BarlowCondensed_600SemiBold,
  [fontFamilies.condensed.bold]: BarlowCondensed_700Bold,
  [fontFamilies.sans.regular]: Barlow_400Regular,
  [fontFamilies.sans.medium]: Barlow_500Medium,
  [fontFamilies.sans.semibold]: Barlow_600SemiBold,
  [fontFamilies.sans.bold]: Barlow_700Bold,
  [fontFamilies.arabic.regular]: Cairo_400Regular,
  [fontFamilies.arabic.medium]: Cairo_500Medium,
  [fontFamilies.arabic.semibold]: Cairo_600SemiBold,
  [fontFamilies.arabic.bold]: Cairo_700Bold,
};
