/**
 * `ListRow` (11.2) — une ligne de liste : pastille d'icône, titre, sous-titre, contenu à droite.
 * Les listes de leçons, d'examens, d'élèves et de demandes partagent désormais la même densité.
 */

import React from 'react';
import { Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
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
  const colors = toneColors(theme, tone);

  const content = (
    <>
      {icon ? (
        <View
          style={[styles.icon, { backgroundColor: colors.soft, borderRadius: theme.radius.md }]}
        >
          <Ionicons name={icon} size={18} color={colors.text} />
        </View>
      ) : null}

      <View style={[styles.texts, { gap: 2 }]}>
        <Text
          style={{
            color: theme.colors.textPrimary,
            fontSize: theme.typography.size.base,
            fontWeight: theme.typography.weight.medium,
          }}
          numberOfLines={1}
        >
          {title}
        </Text>
        {subtitle ? (
          <Text
            style={{ color: theme.colors.textSecondary, fontSize: theme.typography.size.sm }}
            numberOfLines={2}
          >
            {subtitle}
          </Text>
        ) : null}
        {meta ? (
          <Text style={{ color: theme.colors.textMuted, fontSize: theme.typography.size.xs }}>
            {meta}
          </Text>
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
      style={({ pressed }) => [shape, pressed && { opacity: 0.6 }]}
    >
      {content}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  icon: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  texts: { flex: 1 },
});
