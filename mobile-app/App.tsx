/**
 * Racine de l'application : zones sûres, thème (D-52), langue (D-47), toasts (11.5) puis session.
 * L'ordre compte — le thème et la langue habillent tout, les toasts se posent au-dessus des
 * écrans, et la session décide de la pile de navigation affichée.
 *
 * Les polices « Circuit » (13.2) et le choix de thème mémorisé (13.3) sont lus avant le premier
 * écran : l'écran de démarrage reste affiché jusque-là, sans éclair d'un thème puis de l'autre.
 * Si les polices échouent, l'application part avec celles du système plutôt que de rester
 * bloquée.
 */

import React, { useEffect, useState } from 'react';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/context/AuthContext';
import { LanguageProvider } from './src/context/LanguageContext';
import {
  ThemePreference,
  ThemeProvider,
  ThemedStatusBar,
  loadThemePreference,
} from './src/context/ThemeContext';
import { ToastProvider } from './src/context/ToastContext';
import { AppNavigator } from './src/navigation/AppNavigator';
import { FONT_ASSETS } from './src/theme/fontAssets';

SplashScreen.preventAutoHideAsync().catch(() => {
  // Déjà masqué (rechargement à chaud) : rien à faire
});

export default function App() {
  const [fontsLoaded, fontError] = useFonts(FONT_ASSETS);
  const [themePreference, setThemePreference] = useState<ThemePreference | null>(null);
  const ready = (fontsLoaded || fontError !== null) && themePreference !== null;

  useEffect(() => {
    loadThemePreference().then(setThemePreference);
  }, []);

  useEffect(() => {
    if (ready) {
      SplashScreen.hideAsync().catch(() => undefined);
    }
  }, [ready]);

  if (!ready) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <ThemeProvider initialPreference={themePreference ?? undefined}>
        <LanguageProvider>
          <ToastProvider>
            <AuthProvider>
              <ThemedStatusBar />
              <AppNavigator />
            </AuthProvider>
          </ToastProvider>
        </LanguageProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
