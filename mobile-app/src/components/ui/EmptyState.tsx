/**
 * `EmptyState` (11.2) — une liste vide n'est pas une erreur : elle propose la suite. Icône,
 * titre, explication et une action. Remplace les « Aucun résultat » centrés sans issue (11.5).
 */

import React from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
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
  const colors = toneColors(theme, tone);

  return (
    <View
      style={[styles.root, { padding: theme.spacing.xl, gap: theme.spacing.md }, style]}
      testID={testID}
    >
      <View
        style={[styles.bubble, { backgroundColor: colors.soft, borderRadius: theme.radius.pill }]}
      >
        <Ionicons name={icon} size={28} color={colors.text} />
      </View>

      <Text
        style={[
          styles.center,
          {
            color: theme.colors.textPrimary,
            fontSize: theme.typography.size.lg,
            fontWeight: theme.typography.weight.semibold,
          },
        ]}
      >
        {title}
      </Text>

      {message ? (
        <Text
          style={[
            styles.center,
            { color: theme.colors.textSecondary, fontSize: theme.typography.size.sm },
          ]}
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
  bubble: { width: 64, height: 64, alignItems: 'center', justifyContent: 'center' },
  center: { textAlign: 'center' },
});
