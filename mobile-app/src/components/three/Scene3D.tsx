/**
 * `Scene3D` (13.8, D-52) — l'enveloppe de toute scène 3D temps réel (`expo-gl` + three.js par
 * `@react-three/fiber`). La 3D est un plus, jamais un obstacle : l'enveloppe affiche l'image
 * fixe `fallback` à la place de la scène
 * - tant que l'écran n'a pas fini de s'afficher (montage différé : la 3D ne retarde jamais le
 *   premier rendu) ;
 * - si « réduire les animations » est actif ;
 * - si la scène plante (limite d'erreur : contexte GL refusé, modèle illisible…) ;
 * - si, passé 1,5 s de chauffe (compilation des shaders, chargement des modèles), 60 images
 *   tournent en moyenne sous 40 images par seconde.
 * La boucle de rendu s'arrête quand l'écran n'est plus affiché ou que l'app passe en arrière-
 * plan : pas de batterie brûlée pour rien.
 *
 * Attention : `Canvas` crée son propre arbre React — les contextes (thème, langue) n'y passent
 * pas. Une scène reçoit ses couleurs **en propriétés**, lues avant par l'écran.
 */

import React, { Component, ReactNode, useContext, useEffect, useState } from 'react';
import {
  AppState,
  LogBox,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import { NavigationContext } from '@react-navigation/native';
import { Canvas, useFrame } from '@react-three/fiber/native';
import { useReducedMotion } from '../../hooks/useReducedMotion';

// `@react-three/fiber` 9.8 crée encore un `THREE.Clock`, que three 0.186 déclare obsolète :
// l'avertissement vient de la bibliothèque, pas de notre code, et n'a aucun effet sur le rendu.
LogBox.ignoreLogs(['THREE.Clock: This module has been deprecated']);

/** Nombre d'images mesurées, débit minimal accepté, et chauffe ignorée avant la mesure. */
export const FPS_SAMPLE = 60;
export const MIN_FPS = 40;
export const WARMUP_SECONDS = 1.5;

/** Vrai si l'échantillon (durées d'image en secondes) tourne en moyenne sous `MIN_FPS`. */
export const isTooSlow = (deltas: readonly number[]): boolean => {
  if (deltas.length < FPS_SAMPLE) return false;
  const total = deltas.slice(0, FPS_SAMPLE).reduce((sum, delta) => sum + delta, 0);
  return total > 0 && FPS_SAMPLE / total < MIN_FPS;
};

/**
 * Mesure la fluidité puis se tait ; prévient une seule fois si c'est trop lent. Les premières
 * images (compilation des shaders, modèles qui arrivent) saccadent sur tous les téléphones : elles
 * ne comptent pas.
 */
const FpsProbe = ({ onSlow }: { onSlow: () => void }) => {
  const [deltas] = useState<number[]>(() => []);
  const [warmup] = useState(() => ({ elapsed: 0 }));
  const [done, setDone] = useState(false);
  useFrame((_, delta) => {
    if (done) return;
    if (warmup.elapsed < WARMUP_SECONDS) {
      warmup.elapsed += delta;
      return;
    }
    deltas.push(delta);
    if (deltas.length >= FPS_SAMPLE) {
      setDone(true);
      if (isTooSlow(deltas)) onSlow();
    }
  });
  return null;
};

class SceneBoundary extends Component<
  { children: ReactNode; fallback: ReactNode; onError: () => void },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch() {
    this.props.onError();
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

/** Écran affiché ? Hors navigation (tests, écran isolé) : toujours vrai. */
const useScreenFocused = (): boolean => {
  const navigation = useContext(NavigationContext);
  const [focused, setFocused] = useState(() => navigation?.isFocused() ?? true);
  useEffect(() => {
    if (!navigation) return;
    const unsubscribeFocus = navigation.addListener('focus', () => setFocused(true));
    const unsubscribeBlur = navigation.addListener('blur', () => setFocused(false));
    return () => {
      unsubscribeFocus();
      unsubscribeBlur();
    };
  }, [navigation]);
  return focused;
};

const useAppActive = (): boolean => {
  const [active, setActive] = useState(AppState.currentState !== 'background');
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (next) =>
      setActive(next === 'active')
    );
    return () => subscription.remove();
  }, []);
  return active;
};

interface IdleScheduler {
  requestIdleCallback?: (callback: () => void) => number;
  cancelIdleCallback?: (handle: number) => void;
}

export type Scene3DFallbackReason = 'loading' | 'reduced-motion' | 'error' | 'slow';

interface Scene3DProps {
  /** Le contenu three.js (lumières, objets). */
  children: ReactNode;
  /** Image fixe de repli, à la même taille que la scène. */
  fallback: ReactNode;
  height: number;
  /** Ce que montre la scène, pour les lecteurs d'écran (la 3D n'est pas lisible). */
  accessibilityLabel: string;
  /** Prévenu quand la scène cède la place à son image (suivi, tests). */
  onFallback?: (reason: Scene3DFallbackReason) => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export const Scene3D = ({
  children,
  fallback,
  height,
  accessibilityLabel,
  onFallback,
  style,
  testID,
}: Scene3DProps) => {
  const reduced = useReducedMotion();
  const focused = useScreenFocused();
  const appActive = useAppActive();
  const [ready, setReady] = useState(false);
  const [failure, setFailure] = useState<'error' | 'slow' | null>(null);

  // Montage différé : la scène attend que le premier affichage soit terminé
  useEffect(() => {
    const idle = globalThis as unknown as IdleScheduler;
    if (typeof idle.requestIdleCallback === 'function') {
      const handle = idle.requestIdleCallback(() => setReady(true));
      return () => idle.cancelIdleCallback?.(handle);
    }
    const timer = setTimeout(() => setReady(true), 0);
    return () => clearTimeout(timer);
  }, []);

  const reason: Scene3DFallbackReason | null = reduced
    ? 'reduced-motion'
    : failure ?? (ready ? null : 'loading');

  useEffect(() => {
    if (reason && reason !== 'loading') {
      // En développement, la raison s'affiche dans Metro : « pourquoi je ne vois pas la 3D ? »
      if (__DEV__) console.log(`[Scene3D] image fixe à la place de la 3D : ${reason}`);
      onFallback?.(reason);
    }
  }, [reason, onFallback]);

  return (
    <View
      style={[{ height }, styles.root, style]}
      accessible
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel}
      testID={testID}
    >
      {reason ? (
        fallback
      ) : (
        <SceneBoundary fallback={fallback} onError={() => setFailure('error')}>
          <Canvas
            style={styles.fill}
            frameloop={focused && appActive ? 'always' : 'never'}
            camera={{ position: [0, 1.6, 5.2], fov: 40 }}
          >
            <FpsProbe onSlow={() => setFailure('slow')} />
            {children}
          </Canvas>
        </SceneBoundary>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  root: { overflow: 'hidden' },
  fill: { flex: 1 },
});
