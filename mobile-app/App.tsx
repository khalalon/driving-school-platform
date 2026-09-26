/**
 * Racine de l'application : zones sûres, thème (D-52), langue (D-47), toasts (11.5) puis session.
 * L'ordre compte — le thème et la langue habillent tout, les toasts se posent au-dessus des
 * écrans, et la session décide de la pile de navigation affichée.
 *
 * Les polices « Circuit » (13.2) sont chargées avant le premier écran : l'écran de démarrage
 * reste affiché jusque-là. En cas d'échec, l'application part avec les polices du système
 * plutôt que de rester bloquée.
 */

import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/context/AuthContext';
import { LanguageProvider } from './src/context/LanguageContext';
import { ThemeProvider } from './src/context/ThemeContext';
import { ToastProvider } from './src/context/ToastContext';
import { AppNavigator } from './src/navigation/AppNavigator';
import { FONT_ASSETS } from './src/theme/fontAssets';

SplashScreen.preventAutoHideAsync().catch(() => {
  // Déjà masqué (rechargement à chaud) : rien à faire
});

export default function App() {
  const [fontsLoaded, fontError] = useFonts(FONT_ASSETS);
  const ready = fontsLoaded || fontError !== null;

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
      <ThemeProvider>
        <LanguageProvider>
          <ToastProvider>
            <AuthProvider>
              <StatusBar style="auto" />
              <AppNavigator />
            </AuthProvider>
          </ToastProvider>
        </LanguageProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
