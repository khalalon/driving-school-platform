/**
 * `ListRow` (11.2, refaite en 13.5 — D-52) — une ligne de liste : pastille d'icône carrée,
 * titre, sous-titre, contenu à droite, filet de séparation. Les listes de leçons, d'examens,
 * d'élèves et de demandes partagent la même densité et la même typographie.
 */

import React from 'react';
import { Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useTextStyle } from '../../theme';
import { MIN_TOUCH_TARGET } from '../../theme/tokens';
import { IoniconName, mirrorIcon } from '../../utils/rtl';
import { Tone, toneColors } from './tones';

interface ListRowProps {
  title: string;
  subtitle?: string;
  /** Troisième ligne : horaire, lieu, montant. */
  meta?: string;
  icon?: IoniconName;
  /** Intention de la pastille d'icône. */
  tone?: Tone;
  /** Contenu libre à droite : `Badge`, montant, bouton. */
  trailing?: React.ReactNode;
  onPress?: () => void;
  /** Chevron de navigation, quand la ligne ouvre un détail. */
  chevron?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export const ListRow = ({
  title,
  subtitle,
  meta,
  icon,
  tone = 'neutral',
  trailing,
  onPress,
  chevron = false,
  style,
  testID,
}: ListRowProps) => {
  const theme = useTheme();
  const titleStyle = useTextStyle('bodyStrong');
  const captionStyle = useTextStyle('caption');
  const colors = toneColors(theme, tone);

  const content = (
    <>
      {icon ? (
        <View
          style={[styles.icon, { backgroundColor: colors.soft, borderRadius: theme.radius.sm }]}
        >
          <Ionicons name={icon} size={18} color={colors.text} />
        </View>
      ) : null}

      <View style={[styles.texts, { gap: 2 }]}>
        <Text style={[titleStyle, { color: theme.colors.textPrimary }]} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={[captionStyle, { color: theme.colors.textSecondary }]} numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
        {meta ? (
          <Text style={[captionStyle, { color: theme.colors.textMuted }]}>{meta}</Text>
        ) : null}
      </View>

      {trailing}
      {chevron ? (
        <Ionicons name={mirrorIcon('chevron-forward')} size={18} color={theme.colors.textMuted} />
      ) : null}
    </>
  );

  const shape: StyleProp<ViewStyle> = [
    styles.row,
    {
      gap: theme.spacing.md,
      paddingVertical: theme.spacing.md,
      minHeight: MIN_TOUCH_TARGET,
      borderBottomColor: theme.colors.border,
    },
    style,
  ];

  if (!onPress) {
    return (
      <View style={shape} testID={testID}>
        {content}
      </View>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={subtitle ? `${title}, ${subtitle}` : title}
      testID={testID}
      style={({ pressed }) => [shape, pressed && { backgroundColor: theme.colors.surfaceMuted }]}
    >
      {content}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  icon: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  texts: { flex: 1 },
});
