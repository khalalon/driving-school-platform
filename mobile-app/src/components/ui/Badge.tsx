/**
 * `Badge` (11.2, refait en 13.5 — D-52) — étiquette de statut, jamais cliquable : statut d'une
 * leçon, résultat d'un examen, état d'une demande. Libellé en capitales condensées sur le fond
 * doux de l'intention ; le point optionnel change aussi de **forme** selon l'intention (carré,
 * rond, losange), pour que le statut ne repose jamais sur la seule couleur.
 * Le libellé arrive traduit : le composant ne connaît ni les enums ni les textes.
 */

import React from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { useTextStyle } from '../../theme';
import { Tone, toneColors } from './tones';

interface BadgeProps {
  label: string;
  tone?: Tone;
  /** Repère de forme à gauche du libellé, pour les listes denses. */
  dot?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/** Forme du repère par intention : rond (information), carré (fait), losange (alerte). */
const DOT_SHAPES: Record<Tone, ViewStyle> = {
  neutral: { borderRadius: 1 },
  accent: { borderRadius: 4 },
  telemetry: { borderRadius: 4 },
  success: { borderRadius: 1 },
  warning: { borderRadius: 1, transform: [{ rotate: '45deg' }] },
  danger: { borderRadius: 0, transform: [{ rotate: '45deg' }] },
};

export const Badge = ({ label, tone = 'neutral', dot = false, style, testID }: BadgeProps) => {
  const theme = useTheme();
  const labelStyle = useTextStyle('label');
  const colors = toneColors(theme, tone);

  return (
    <View
      accessibilityRole="text"
      testID={testID}
      style={[
        styles.base,
        {
          backgroundColor: colors.soft,
          borderRadius: theme.radius.xs,
          paddingHorizontal: theme.spacing.sm,
          paddingVertical: 3,
          gap: 6,
        },
        style,
      ]}
    >
      {dot ? (
        <View style={[styles.dot, DOT_SHAPES[tone], { backgroundColor: colors.text }]} />
      ) : null}
      <Text
        style={[
          labelStyle,
          {
            color: colors.text,
            fontSize: 12,
            lineHeight: 16,
            letterSpacing: labelStyle.letterSpacing ? 0.8 : 0,
          },
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  base: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start' },
  dot: { width: 7, height: 7 },
});
