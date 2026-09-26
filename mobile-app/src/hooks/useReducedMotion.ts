/**
 * « Réduire les animations » (réglage d'accessibilité du téléphone, 13.4). Quand il est actif,
 * les animations décoratives sont coupées et la 3D laisse place à son image fixe (13.8).
 * Suit le réglage en direct : pas besoin de redémarrer l'application.
 */

import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

export const useReducedMotion = (): boolean => {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    let active = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((value) => {
        if (active) {
          setReduced(value);
        }
      })
      .catch(() => undefined);
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    return () => {
      active = false;
      subscription.remove();
    };
  }, []);

  return reduced;
};
