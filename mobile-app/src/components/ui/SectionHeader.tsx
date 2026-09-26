/**
 * `SectionHeader` (11.2) — titre de section, avec une action facultative à droite
 * (« Tout voir », « Ajouter »). Donne la même hiérarchie à tous les écrans.
 */

import React from 'react';
import { Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { IoniconName, mirrorIcon } from '../../utils/rtl';

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  icon?: IoniconName;
  action?: { label: string; onPress: () => void };
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export const SectionHeader = ({
  title,
  subtitle,
  icon,
  action,
  style,
  testID,
}: SectionHeaderProps) => {
  const theme = useTheme();

  return (
    <View style={[styles.row, { gap: theme.spacing.sm }, style]} testID={testID}>
      <View style={[styles.titles, { gap: theme.spacing.xs }]}>
        <View style={[styles.titleRow, { gap: theme.spacing.sm }]}>
          {icon ? <Ionicons name={icon} size={18} color={theme.colors.textSecondary} /> : null}
          <Text
            style={{
              color: theme.colors.textPrimary,
              fontSize: theme.typography.size.lg,
              fontWeight: theme.typography.weight.semibold,
            }}
          >
            {title}
          </Text>
        </View>
        {subtitle ? (
          <Text style={{ color: theme.colors.textMuted, fontSize: theme.typography.size.sm }}>
            {subtitle}
          </Text>
        ) : null}
      </View>

      {action ? (
        <Pressable
          onPress={action.onPress}
          accessibilityRole="button"
          accessibilityLabel={action.label}
          style={({ pressed }) => [
            styles.action,
            { gap: theme.spacing.xs },
            pressed && styles.pressed,
          ]}
        >
          <Text
            style={{
              color: theme.colors.signalText,
              fontSize: theme.typography.size.sm,
              fontWeight: theme.typography.weight.semibold,
            }}
          >
            {action.label}
          </Text>
          <Ionicons
            name={mirrorIcon('chevron-forward')}
            size={16}
            color={theme.colors.signalText}
          />
        </Pressable>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  titles: { flex: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center' },
  action: { flexDirection: 'row', alignItems: 'center' },
  pressed: { opacity: 0.6 },
});
