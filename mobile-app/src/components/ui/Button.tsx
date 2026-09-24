/**
 * `Button` (11.2) — une seule implémentation pour les quatre intentions de l'application :
 * `primary` (l'action de l'écran), `secondary` (alternative), `ghost` (action discrète),
 * `danger` (annuler, refuser). Pendant un appel réseau, `loading` désactive le bouton et
 * remplace le libellé par un indicateur : plus besoin d'un `disabled={submitting}` par écran.
 */

import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { Theme } from '../../theme';
import { MIN_TOUCH_TARGET } from '../../theme/tokens';
import { IoniconName } from '../../utils/rtl';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'md' | 'sm';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Appel en cours : bouton inactif, libellé remplacé par un indicateur. */
  loading?: boolean;
  disabled?: boolean;
  icon?: IoniconName;
  /** Côté de l'icône : `trailing` pour une flèche qui pousse vers la suite. */
  iconPosition?: 'leading' | 'trailing';
  /** Occupe toute la largeur disponible (barre d'actions, formulaire). */
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

interface VariantColors {
  background: string;
  backgroundPressed: string;
  text: string;
  border: string | null;
}

/** Couleurs d'un variant dans le thème courant. */
const variantColors = (theme: Theme, variant: ButtonVariant): VariantColors => {
  const { colors } = theme;
  switch (variant) {
    case 'primary':
      return {
        background: colors.accent,
        backgroundPressed: colors.accentPressed,
        text: colors.textOnAccent,
        border: null,
      };
    case 'secondary':
      return {
        background: colors.surfaceRaised,
        backgroundPressed: colors.surfaceMuted,
        text: colors.textPrimary,
        border: colors.borderStrong,
      };
    case 'ghost':
      return {
        background: 'transparent',
        backgroundPressed: colors.surfaceMuted,
        text: colors.accentText,
        border: null,
      };
    case 'danger':
      return {
        background: colors.danger,
        backgroundPressed: colors.dangerText,
        text: colors.textOnAccent,
        border: null,
      };
  }
};

export const Button = ({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon,
  iconPosition = 'leading',
  fullWidth = false,
  style,
  testID,
}: ButtonProps) => {
  const theme = useTheme();
  const palette = variantColors(theme, variant);
  const inactive = disabled || loading;
  const small = size === 'sm';

  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityState={{ disabled: inactive, busy: loading }}
      accessibilityLabel={title}
      testID={testID}
      style={({ pressed }) => [
        styles.base,
        {
          minHeight: small ? MIN_TOUCH_TARGET : MIN_TOUCH_TARGET + 8,
          paddingHorizontal: small ? theme.spacing.base : theme.spacing.lg,
          borderRadius: theme.radius.md,
          backgroundColor: pressed ? palette.backgroundPressed : palette.background,
          borderWidth: palette.border ? 1 : 0,
          borderColor: palette.border ?? 'transparent',
        },
        fullWidth && styles.fullWidth,
        // Un bouton inactif reste lisible : on baisse l'opacité, on ne change pas la couleur
        inactive && styles.inactive,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={palette.text} size="small" />
      ) : (
        <View style={[styles.row, { gap: theme.spacing.sm }]}>
          {icon && iconPosition === 'leading' ? (
            <Ionicons name={icon} size={small ? 16 : 18} color={palette.text} />
          ) : null}
          <Text
            style={{
              color: palette.text,
              fontSize: small ? theme.typography.size.sm : theme.typography.size.base,
              fontWeight: theme.typography.weight.semibold,
            }}
            numberOfLines={1}
          >
            {title}
          </Text>
          {icon && iconPosition === 'trailing' ? (
            <Ionicons name={icon} size={small ? 16 : 18} color={palette.text} />
          ) : null}
        </View>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  base: { alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center' },
  fullWidth: { alignSelf: 'stretch' },
  inactive: { opacity: 0.5 },
});
