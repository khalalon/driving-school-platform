/**
 * `Skeleton` (11.2, refait en 13.5 — D-52) — bloc de chargement à la forme du contenu attendu.
 * Un rond qui tourne ne dit rien ; un squelette annonce ce qui arrive et évite le saut de mise
 * en page (11.5). Il pulse doucement, sauf si « réduire les animations » est actif : il reste
 * alors fixe.
 */

import React, { useEffect, useRef } from 'react';
import {
  Animated,
  DimensionValue,
  Easing,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { useReducedMotion } from '../../hooks/useReducedMotion';

interface SkeletonProps {
  width?: DimensionValue;
  height?: number;
  /** Rayon des coins ; `pill` pour une pastille, par défaut le rayon des petites surfaces. */
  radius?: number;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export const Skeleton = ({ width = '100%', height = 16, radius, style, testID }: SkeletonProps) => {
  const theme = useTheme();
  const reduced = useReducedMotion();
  const pulse = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    if (reduced) {
      pulse.setValue(0.7);
      return;
    }
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 700,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0.4,
          duration: 700,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [pulse, reduced]);

  return (
    <Animated.View
      testID={testID}
      accessibilityRole="progressbar"
      style={[
        {
          width,
          height,
          borderRadius: radius ?? theme.radius.xs,
          backgroundColor: theme.colors.skeleton,
          opacity: pulse,
        },
        style,
      ]}
    />
  );
};

/** Squelette d'une carte : un titre, deux lignes de texte. Le cas le plus fréquent. */
export const SkeletonCard = ({ lines = 2 }: { lines?: number }) => {
  const theme = useTheme();

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.colors.surfaceRaised,
          borderColor: theme.colors.border,
          borderRadius: theme.radius.lg,
          padding: theme.spacing.base,
          gap: theme.spacing.sm,
        },
      ]}
    >
      <Skeleton width="55%" height={18} />
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton key={index} width={index === lines - 1 ? '70%' : '100%'} height={12} />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  card: { borderWidth: 1 },
});
