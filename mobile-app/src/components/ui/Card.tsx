/**
 * `Card` (11.2, refaite en 13.5 — D-52) — la surface posée sur le fond, **à plat** : fond
 * `surfaceRaised`, filet `border`, angles du tableau de bord (rayon `lg`). Aucune ombre : dans
 * le style « Circuit », la profondeur vient du filet et du contraste des surfaces.
 * `highlighted` teinte la carte en signal (prochaine leçon, étape en cours).
 */

import React from 'react';
import { Animated, Pressable, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { usePressFeedback } from '../../hooks/usePressFeedback';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface CardProps {
  children: React.ReactNode;
  /** Carte cliquable : retour visuel à la pression et rôle d'accessibilité. */
  onPress?: () => void;
  /** Mise en avant : fond teinté signal (prochaine leçon, étape en cours). */
  highlighted?: boolean;
  /**
   * Conservé pour compatibilité (11.2) : le style « Circuit » est à plat, `none` retire en plus
   * le filet (carte imbriquée dans une autre).
   */
  elevation?: 'none' | 'sm' | 'md';
  padded?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  testID?: string;
}

export const Card = ({
  children,
  onPress,
  highlighted = false,
  elevation = 'sm',
  padded = true,
  style,
  accessibilityLabel,
  testID,
}: CardProps) => {
  const theme = useTheme();
  const feedback = usePressFeedback();
  const base: StyleProp<ViewStyle> = [
    styles.base,
    {
      backgroundColor: highlighted ? theme.colors.surfaceSignal : theme.colors.surfaceRaised,
      borderColor: highlighted ? theme.colors.gauge : theme.colors.border,
      borderWidth: elevation === 'none' && !highlighted ? 0 : 1,
      borderRadius: theme.radius.lg,
      padding: padded ? theme.spacing.base : 0,
    },
    style,
  ];

  if (!onPress) {
    return (
      <View style={base} testID={testID}>
        {children}
      </View>
    );
  }

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={feedback.onPressIn}
      onPressOut={feedback.onPressOut}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      testID={testID}
      style={[base, feedback.style]}
    >
      {children}
    </AnimatedPressable>
  );
};

const styles = StyleSheet.create({
  base: { overflow: 'hidden' },
});
