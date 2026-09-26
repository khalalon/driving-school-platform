/**
 * `TimeBlock` (13.6, D-52) — l'heure d'abord, lisible d'un coup d'œil : surtitre en signal
 * (« PROCHAINE SESSION »), grande heure en chiffres tabulaires, ligne de contexte en capitales
 * (« JEU 02 OCT · MANŒUVRE · 60 MIN »), contenu libre à droite (délai, instructeur).
 * Les textes arrivent formatés par l'appelant (`utils/format`).
 */

import React from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { useTextStyle } from '../../theme';

interface TimeBlockProps {
  time: string;
  kicker?: string;
  /** Contexte : date · type · durée. */
  line?: string;
  trailing?: React.ReactNode;
  /** `sm` pour une liste (heure plus petite). */
  size?: 'md' | 'sm';
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export const TimeBlock = ({
  time,
  kicker,
  line,
  trailing,
  size = 'md',
  style,
  testID,
}: TimeBlockProps) => {
  const theme = useTheme();
  const numeric = useTextStyle('numeric');
  const label = useTextStyle('label');
  const small = size === 'sm';

  return (
    <View style={[styles.row, { gap: theme.spacing.md }, style]} testID={testID}>
      <View style={styles.texts}>
        {kicker ? <Text style={[label, { color: theme.colors.signalText }]}>{kicker}</Text> : null}
        <Text
          style={[
            numeric,
            {
              color: theme.colors.textPrimary,
              fontSize: small ? 30 : 44,
              lineHeight: small ? 32 : 46,
            },
          ]}
        >
          {time}
        </Text>
        {line ? (
          <Text
            style={[
              label,
              {
                color: theme.colors.textSecondary,
                fontSize: 15,
                lineHeight: 19,
                letterSpacing: label.letterSpacing ? 0.8 : 0,
              },
            ]}
            numberOfLines={2}
          >
            {line}
          </Text>
        ) : null}
      </View>
      {trailing ? <View style={[styles.trailing, { gap: theme.spacing.sm }]}>{trailing}</View> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  texts: { flex: 1, gap: 2 },
  trailing: { alignItems: 'flex-end' },
});
