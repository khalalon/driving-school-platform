/**
 * Toasts (11.5) — une action réussie s'annonce sans bloquer l'écran.
 *
 * `Alert.alert` reste pour ce qui demande une vraie décision (annuler une leçon, refuser une
 * demande) et pour les erreurs bloquantes ; tout le reste passe par `useToast().showToast(...)`.
 * Un seul toast à la fois : le dernier remplace le précédent et relance le compte à rebours.
 */

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Toast } from '../components/ui';
import { Tone } from '../components/ui/tones';

/** Durée d'affichage : assez pour lire une phrase, assez court pour ne pas gêner. */
const TOAST_DURATION_MS = 3000;

interface ToastContextValue {
  /** Affiche un message ; `tone` par défaut : succès. */
  showToast: (message: string, tone?: Tone) => void;
  /** Ferme le toast courant (le bouton de fermeture s'en sert). */
  hideToast: () => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

interface ToastState {
  message: string;
  tone: Tone;
  /** Change à chaque appel : force le remontage (donc l'animation) même à message égal. */
  key: number;
}

export const ToastProvider = ({ children }: { children: React.ReactNode }) => {
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState<ToastState | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = () => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  };

  const hideToast = useCallback(() => {
    clearTimer();
    setToast(null);
  }, []);

  const showToast = useCallback((message: string, tone: Tone = 'success') => {
    clearTimer();
    setToast({ message, tone, key: Date.now() });
    timer.current = setTimeout(() => setToast(null), TOAST_DURATION_MS);
  }, []);

  // Un écran démonté pendant l'attente ne doit pas laisser le minuteur derrière lui
  useEffect(() => clearTimer, []);

  return (
    <ToastContext.Provider value={{ showToast, hideToast }}>
      {children}
      {toast ? (
        <View
          pointerEvents="box-none"
          style={[styles.host, { bottom: insets.bottom + 16 }]}
          testID="toast-host"
        >
          <Toast key={toast.key} message={toast.message} tone={toast.tone} onDismiss={hideToast} />
        </View>
      ) : null}
    </ToastContext.Provider>
  );
};

/**
 * Hors `ToastProvider` (tests unitaires d'un écran isolé), les appels sont sans effet plutôt
 * que fatals : un toast n'est jamais essentiel au déroulement d'une action.
 */
export const useToast = (): ToastContextValue =>
  useContext(ToastContext) ?? { showToast: () => undefined, hideToast: () => undefined };

const styles = StyleSheet.create({
  host: {
    position: 'absolute',
    left: 16,
    right: 16,
  },
});
