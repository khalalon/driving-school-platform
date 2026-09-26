/**
 * `Chip` (11.2, refaite en 13.5 — D-52) — pastille cliquable : filtre d'onglet, choix d'un type
 * de leçon, langue, thème. Angles nets et libellé condensé ; sélectionnée, elle prend le fond
 * doux de son intention, un filet vif **et** une coche : la sélection ne repose jamais sur la
 * seule couleur. Sans `onPress`, elle sert d'étiquette.
 */

import React from 'react';
import { Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useTextStyle } from '../../theme';
import { IoniconName } from '../../utils/rtl';
import { haptics } from '../../utils/haptics';
import { Tone, toneColors } from './tones';

/** Hauteur visible d'une pastille : ~36 px ; le débord porte la zone touchable à 48 px (11.6). */
const CHIP_HIT_SLOP = { top: 6, bottom: 6, left: 4, right: 4 };

interface ChipProps {
  label: string;
  onPress?: () => void;
  /** Sélectionné : fond de l'intention, filet vif, coche. */
  selected?: boolean;
  tone?: Tone;
  icon?: IoniconName;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export const Chip = ({
  label,
  onPress,
  selected = false,
  tone = 'accent',
  icon,
  disabled = false,
  style,
  testID,
}: ChipProps) => {
  const theme = useTheme();
  const labelStyle = useTextStyle('label');
  const colors = toneColors(theme, tone);
  const background = selected ? colors.soft : theme.colors.surfaceRaised;
  const text = selected ? colors.text : theme.colors.textSecondary;
  const leadingIcon: IoniconName | undefined = selected ? 'checkmark' : icon;

  const content = (
    <View style={[styles.row, { gap: theme.spacing.xs }]}>
      {leadingIcon ? <Ionicons name={leadingIcon} size={15} color={text} /> : null}
      <Text
        style={[
          labelStyle,
          {
            color: text,
            fontSize: 14,
            lineHeight: 18,
            letterSpacing: labelStyle.letterSpacing ? 0.8 : 0,
          },
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </View>
  );

  const shape: StyleProp<ViewStyle> = [
    styles.base,
    {
      backgroundColor: background,
      borderColor: selected ? colors.solid : theme.colors.borderStrong,
      borderRadius: theme.radius.sm,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
    },
    disabled && styles.disabled,
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
      onPress={() => {
        if (!selected) {
          haptics.selection();
        }
        onPress();
      }}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ selected, disabled }}
      accessibilityLabel={label}
      testID={testID}
      // Une pastille reste visuellement fine ; la zone touchable, elle, atteint 48 px (11.6)
      hitSlop={CHIP_HIT_SLOP}
      style={({ pressed }) => [shape, pressed && { backgroundColor: theme.colors.surfaceMuted }]}
    >
      {content}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  base: { borderWidth: 1, alignSelf: 'flex-start' },
  row: { flexDirection: 'row', alignItems: 'center' },
  disabled: { opacity: 0.45 },
});
