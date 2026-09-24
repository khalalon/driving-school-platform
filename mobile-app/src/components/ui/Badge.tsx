/**
 * `Badge` (11.2) — étiquette de statut, jamais cliquable : statut d'une leçon, résultat d'un
 * examen, état d'une demande. Le libellé arrive traduit (`lessonStatusLabel`, `examResultLabel`) :
 * le composant ne connaît ni les enums ni les textes.
 */

import React from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { Tone, toneColors } from './tones';

interface BadgeProps {
  label: string;
  tone?: Tone;
  /** Point de couleur à gauche du libellé, pour les listes denses. */
  dot?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export const Badge = ({ label, tone = 'neutral', dot = false, style, testID }: BadgeProps) => {
  const theme = useTheme();
  const colors = toneColors(theme, tone);

  return (
    <View
      accessibilityRole="text"
      testID={testID}
      style={[
        styles.base,
        {
          backgroundColor: colors.soft,
          borderRadius: theme.radius.pill,
          paddingHorizontal: theme.spacing.sm,
          paddingVertical: theme.spacing.xs,
          gap: theme.spacing.xs,
        },
        style,
      ]}
    >
      {dot ? <View style={[styles.dot, { backgroundColor: colors.solid }]} /> : null}
      <Text
        style={{
          color: colors.text,
          fontSize: theme.typography.size.xs,
          fontWeight: theme.typography.weight.semibold,
        }}
        numberOfLines={1}
      >
        {label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  base: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start' },
  dot: { width: 6, height: 6, borderRadius: 3 },
});
