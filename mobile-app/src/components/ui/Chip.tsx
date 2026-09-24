/**
 * `Chip` (11.2) — pastille cliquable : filtre d'onglet, choix d'un type de leçon, langue.
 * Un `Chip` non cliquable existe aussi (`onPress` absent) : il sert alors d'étiquette.
 */

import React from 'react';
import { Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { IoniconName } from '../../utils/rtl';
import { MIN_TOUCH_TARGET } from '../../theme/tokens';
import { Tone, toneColors } from './tones';

/** Hauteur visible d'une pastille : ~34 px ; le débord porte la zone touchable à 44 px (11.6). */
const CHIP_HIT_SLOP = { top: 6, bottom: 6, left: 4, right: 4 };
/** Hauteur touchable effective, relue par le test d'accessibilité. */
export const CHIP_TOUCH_HEIGHT = MIN_TOUCH_TARGET;

interface ChipProps {
  label: string;
  onPress?: () => void;
  /** Sélectionné : fond de l'intention, bordure marquée. */
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
  const colors = toneColors(theme, tone);
  const background = selected ? colors.soft : theme.colors.surfaceRaised;
  const text = selected ? colors.text : theme.colors.textSecondary;

  const content = (
    <View style={[styles.row, { gap: theme.spacing.xs }]}>
      {icon ? <Ionicons name={icon} size={14} color={text} /> : null}
      <Text
        style={{
          color: text,
          fontSize: theme.typography.size.sm,
          fontWeight: selected ? theme.typography.weight.semibold : theme.typography.weight.medium,
        }}
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
      borderColor: selected ? colors.solid : theme.colors.border,
      borderRadius: theme.radius.pill,
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
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ selected, disabled }}
      accessibilityLabel={label}
      testID={testID}
      // Une pastille reste visuellement fine ; la zone touchable, elle, atteint 44 px (11.6)
      hitSlop={CHIP_HIT_SLOP}
      style={({ pressed }) => [shape, pressed && styles.pressed]}
    >
      {content}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  base: { borderWidth: 1, alignSelf: 'flex-start' },
  row: { flexDirection: 'row', alignItems: 'center' },
  pressed: { opacity: 0.8 },
  disabled: { opacity: 0.5 },
});
