/**
 * `Gauge` (13.6, D-52) — jauge de compteur en demi-cercle : piste `gaugeTrack`, arc `gauge`
 * (≥ 3:1 sur la carte), valeur au centre en chiffres tabulaires, légende en capitales.
 * Annoncée comme une barre de progression (« 3 étapes sur 5 », libellé fourni par l'appelant).
 * En arabe, l'arc se remplit de droite à gauche, dans le sens de la lecture.
 */

import React from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useTheme } from '../../context/ThemeContext';
import { isRTL } from '../../i18n';
import { useTextStyle } from '../../theme';

interface GaugeProps {
  value: number;
  max: number;
  /** Lu par les lecteurs d'écran : « 3 étapes sur 5 » (traduit par l'appelant). */
  accessibilityLabel: string;
  /** Texte au centre ; par défaut « valeur/max ». */
  display?: string;
  /** Légende sous la valeur (« ÉTAPES »). */
  caption?: string;
  /** Largeur en points ; la hauteur en découle (demi-cercle). */
  size?: number;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

const STROKE = 14;

/** Longueur de l'arc rempli pour une valeur, bornée à [0, longueur]. */
export const gaugeFill = (value: number, max: number, length: number): number => {
  if (max <= 0) return 0;
  return Math.min(Math.max(value / max, 0), 1) * length;
};

export const Gauge = ({
  value,
  max,
  accessibilityLabel,
  display,
  caption,
  size = 170,
  style,
  testID,
}: GaugeProps) => {
  const theme = useTheme();
  const numeric = useTextStyle('numeric');
  const label = useTextStyle('label');

  const radius = (size - STROKE) / 2;
  const height = radius + STROKE;
  const cx = size / 2;
  const cy = radius + STROKE / 2;
  const arc = `M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy}`;
  const length = Math.PI * radius;
  const filled = gaugeFill(value, max, length);

  return (
    <View
      style={[{ width: size, height: height + 4 }, style]}
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min: 0, max, now: Math.min(Math.max(value, 0), max) }}
      testID={testID}
    >
      <Svg
        width={size}
        height={height}
        style={isRTL() ? styles.mirrored : undefined}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <Path
          d={arc}
          fill="none"
          stroke={theme.colors.gaugeTrack}
          strokeWidth={STROKE}
          strokeLinecap="round"
        />
        {filled > 0 ? (
          <Path
            d={arc}
            fill="none"
            stroke={theme.colors.gauge}
            strokeWidth={STROKE}
            strokeLinecap="round"
            strokeDasharray={`${filled} ${length}`}
          />
        ) : null}
      </Svg>
      <View style={[styles.center, { top: radius * 0.42 }]} pointerEvents="none">
        <Text
          style={[numeric, { color: theme.colors.textPrimary, fontSize: 38, lineHeight: 40 }]}
          accessibilityElementsHidden
        >
          {display ?? `${value}/${max}`}
        </Text>
        {caption ? (
          <Text
            style={[label, { color: theme.colors.textSecondary, fontSize: 12 }]}
            accessibilityElementsHidden
          >
            {caption}
          </Text>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  mirrored: { transform: [{ scaleX: -1 }] },
  center: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
});
