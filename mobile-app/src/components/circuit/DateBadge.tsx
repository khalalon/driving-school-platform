/**
 * `DateBadge` (13.6, D-52) — la date d'une leçon en bloc compact : jour en chiffres tabulaires,
 * mois en capitales condensées, cadre à filet (teinté signal quand c'est aujourd'hui).
 * Jour et mois arrivent formatés par l'appelant (langue de l'utilisateur).
 */

import React from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { useTextStyle } from '../../theme';

interface DateBadgeProps {
  day: string;
  month: string;
  /** Aujourd'hui : cadre teinté signal. */
  highlighted?: boolean;
  /** Lu par les lecteurs d'écran : la date complète. */
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export const DateBadge = ({
  day,
  month,
  highlighted = false,
  accessibilityLabel,
  style,
  testID,
}: DateBadgeProps) => {
  const theme = useTheme();
  const numeric = useTextStyle('numeric');
  const label = useTextStyle('label');

  return (
    <View
      style={[
        styles.box,
        {
          borderRadius: theme.radius.md,
          borderColor: highlighted ? theme.colors.gauge : theme.colors.borderStrong,
          backgroundColor: highlighted ? theme.colors.surfaceSignal : theme.colors.surfaceRaised,
        },
        style,
      ]}
      accessible
      accessibilityLabel={accessibilityLabel ?? `${day} ${month}`}
      testID={testID}
    >
      <Text style={[numeric, { color: theme.colors.textPrimary, fontSize: 22, lineHeight: 24 }]}>
        {day}
      </Text>
      <Text
        style={[
          label,
          { color: highlighted ? theme.colors.signalText : theme.colors.textSecondary, fontSize: 11, lineHeight: 13 },
        ]}
      >
        {month}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  box: {
    width: 54,
    height: 56,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
