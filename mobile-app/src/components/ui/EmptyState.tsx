/**
 * `EmptyState` (11.2, refait en 13.5 — D-52) — une liste vide n'est pas une erreur : elle
 * propose la suite. Icône dans un cadre carré, titre, explication et une action. Remplace les
 * « Aucun résultat » centrés sans issue (11.5).
 */

import React from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useTextStyle } from '../../theme';
import { IoniconName } from '../../utils/rtl';
import { Button } from './Button';
import { Tone, toneColors } from './tones';

interface EmptyStateProps {
  icon: IoniconName;
  title: string;
  message?: string;
  action?: { label: string; onPress: () => void };
  tone?: Tone;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export const EmptyState = ({
  icon,
  title,
  message,
  action,
  tone = 'accent',
  style,
  testID,
}: EmptyStateProps) => {
  const theme = useTheme();
  const headingStyle = useTextStyle('heading');
  const bodyStyle = useTextStyle('body');
  const colors = toneColors(theme, tone);

  return (
    <View
      style={[styles.root, { padding: theme.spacing.xl, gap: theme.spacing.md }, style]}
      testID={testID}
    >
      <View
        style={[
          styles.bubble,
          { backgroundColor: colors.soft, borderColor: colors.solid, borderRadius: theme.radius.lg },
        ]}
      >
        <Ionicons name={icon} size={28} color={colors.text} />
      </View>

      <Text
        style={[styles.center, headingStyle, { color: theme.colors.textPrimary }]}
      >
        {title}
      </Text>

      {message ? (
        <Text
          style={[styles.center, bodyStyle, { color: theme.colors.textSecondary }]}
        >
          {message}
        </Text>
      ) : null}

      {action ? <Button title={action.label} onPress={action.onPress} size="sm" /> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  root: { alignItems: 'center', justifyContent: 'center' },
  bubble: { width: 64, height: 64, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  center: { textAlign: 'center' },
});
