/**
 * `Card` (11.2) — la surface posée sur le fond : fond `surfaceRaised`, bordure fine, rayon et
 * ombre du thème. En sombre, la profondeur vient de la surface (l'ombre portée ne se voit pas),
 * ce que les jetons gèrent déjà : la carte n'a rien à savoir du thème actif.
 */

import React from 'react';
import { Pressable, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { useTheme } from '../../context/ThemeContext';

interface CardProps {
  children: React.ReactNode;
  /** Carte cliquable : retour visuel à la pression et rôle d'accessibilité. */
  onPress?: () => void;
  /** Mise en avant : fond accentué (prochaine leçon, étape en cours). */
  highlighted?: boolean;
  /** `none` pour une carte imbriquée dans une autre. */
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
  const base: StyleProp<ViewStyle> = [
    styles.base,
    {
      backgroundColor: highlighted ? theme.colors.surfaceSignal : theme.colors.surfaceRaised,
      borderColor: highlighted ? theme.colors.signalSoft : theme.colors.border,
      borderRadius: theme.radius.lg,
      padding: padded ? theme.spacing.base : 0,
    },
    theme.shadows[elevation],
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
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      testID={testID}
      style={({ pressed }) => [base, pressed && styles.pressed]}
    >
      {children}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  base: { borderWidth: StyleSheet.hairlineWidth },
  pressed: { opacity: 0.9, transform: [{ scale: 0.995 }] },
});
