/**
 * `StatRow` (13.6, D-52) — une ligne de télémétrie : libellé en capitales condensées à gauche,
 * chiffre tabulaire à droite, filet dessous (« CODE ........ 12 »). Cliquable si `onPress` :
 * elle ouvre alors le détail (files d'attente de l'accueil instructeur).
 */

import React from 'react';
import { Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useTextStyle } from '../../theme';
import { MIN_TOUCH_TARGET } from '../../theme/tokens';
import { mirrorIcon } from '../../utils/rtl';

interface StatRowProps {
  label: string;
  value: string | number;
  onPress?: () => void;
  /** Mise en avant de la valeur (une file qui attend une action). */
  emphasis?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export const StatRow = ({ label, value, onPress, emphasis = false, style, testID }: StatRowProps) => {
  const theme = useTheme();
  const labelStyle = useTextStyle('label');
  const numeric = useTextStyle('numeric');

  const content = (
    <>
      <Text
        style={[
          labelStyle,
          styles.label,
          { color: theme.colors.textSecondary, fontSize: 14, letterSpacing: labelStyle.letterSpacing ? 1.2 : 0 },
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
      <Text
        style={[
          numeric,
          {
            color: emphasis ? theme.colors.signalText : theme.colors.textPrimary,
            fontSize: 24,
            lineHeight: 28,
          },
        ]}
      >
        {value}
      </Text>
      {onPress ? (
        <Ionicons name={mirrorIcon('chevron-forward')} size={16} color={theme.colors.textMuted} />
      ) : null}
    </>
  );

  const shape: StyleProp<ViewStyle> = [
    styles.row,
    { gap: theme.spacing.sm, borderBottomColor: theme.colors.border },
    onPress && { minHeight: MIN_TOUCH_TARGET },
    style,
  ];

  if (!onPress) {
    return (
      <View style={shape} testID={testID} accessible accessibilityLabel={`${label} : ${value}`}>
        {content}
      </View>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${label} : ${value}`}
      testID={testID}
      style={({ pressed }) => [shape, pressed && { backgroundColor: theme.colors.surfaceMuted }]}
    >
      {content}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    paddingVertical: 6,
  },
  label: { flex: 1 },
});
