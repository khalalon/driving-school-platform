/**
 * `SectionHeader` (11.2, refait en 13.5 — D-52) — titre de section en capitales condensées
 * (« SECTEURS DU PARCOURS »), avec une action facultative à droite (« Tout voir », « Ajouter »)
 * en couleur signal. Donne la même hiérarchie à tous les écrans.
 */

import React from 'react';
import { Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useTextStyle } from '../../theme';
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
  const labelStyle = useTextStyle('label');
  const captionStyle = useTextStyle('caption');

  return (
    <View style={[styles.row, { gap: theme.spacing.sm }, style]} testID={testID}>
      <View style={[styles.titles, { gap: theme.spacing.xs }]}>
        <View style={[styles.titleRow, { gap: theme.spacing.sm }]}>
          {icon ? <Ionicons name={icon} size={18} color={theme.colors.textSecondary} /> : null}
          <Text
            style={[labelStyle, { color: theme.colors.textSecondary, fontSize: 14 }]}
            accessibilityRole="header"
          >
            {title}
          </Text>
        </View>
        {subtitle ? (
          <Text style={[captionStyle, { color: theme.colors.textMuted }]}>{subtitle}</Text>
        ) : null}
      </View>

      {action ? (
        <Pressable
          onPress={action.onPress}
          accessibilityRole="button"
          accessibilityLabel={action.label}
          hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
          style={({ pressed }) => [
            styles.action,
            { gap: theme.spacing.xs },
            pressed && styles.pressed,
          ]}
        >
          <Text style={[labelStyle, { color: theme.colors.signalText, fontSize: 14 }]}>
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
