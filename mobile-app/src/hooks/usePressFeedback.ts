/**
 * Retour d'appui (13.4, D-52) : l'élément pressé se réduit légèrement puis revient, par une
 * transformation seule — la mise en page ne bouge pas. Coupé quand « réduire les animations »
 * est actif : l'appui reste alors signalé par la couleur (état `pressed` du composant).
 *
 * Usage : `const press = usePressFeedback();` puis `onPressIn={press.onPressIn}`,
 * `onPressOut={press.onPressOut}` sur le `Pressable`, `style={press.style}` sur une
 * `Animated.View`.
 */

import { useCallback, useMemo, useRef } from 'react';
import { Animated } from 'react-native';
import { motion } from '../theme/motion';
import { useReducedMotion } from './useReducedMotion';

export interface PressFeedback {
  onPressIn: () => void;
  onPressOut: () => void;
  style: { transform: { scale: Animated.Value }[] };
  /** Valeur animée, exposée pour les tests. */
  scale: Animated.Value;
}

export const usePressFeedback = (): PressFeedback => {
  const reduced = useReducedMotion();
  const scale = useRef(new Animated.Value(1)).current;

  const springTo = useCallback(
    (toValue: number) => {
      if (reduced) {
        scale.setValue(1);
        return;
      }
      Animated.spring(scale, {
        toValue,
        ...motion.spring.snappy,
        useNativeDriver: true,
      }).start();
    },
    [reduced, scale]
  );

  const onPressIn = useCallback(() => springTo(motion.pressScale), [springTo]);
  const onPressOut = useCallback(() => springTo(1), [springTo]);

  return useMemo(
    () => ({ onPressIn, onPressOut, style: { transform: [{ scale }] }, scale }),
    [onPressIn, onPressOut, scale]
  );
};
