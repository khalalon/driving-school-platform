/**
 * `Button` (11.2, refait en 13.5 — D-52) — une seule implémentation pour les quatre intentions :
 * `primary` (l'action de l'écran : aplat jaune signal), `secondary` (contour), `ghost` (action
 * discrète) et `danger` (annuler, refuser). Libellé en capitales condensées (rôle `label`).
 *
 * Pendant un appel réseau, `loading` désactive le bouton et remplace le libellé par un
 * indicateur. À l'appui, le bouton se réduit légèrement (`usePressFeedback`, coupé si « réduire
 * les animations » est actif). `haptic` ajoute une vibration, à réserver aux confirmations.
 */

import React, { useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { usePressFeedback } from '../../hooks/usePressFeedback';
import { Theme, useTextStyle } from '../../theme';
import { MIN_TOUCH_TARGET } from '../../theme/tokens';
import { haptics } from '../../utils/haptics';
import { IoniconName } from '../../utils/rtl';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'md' | 'sm';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

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
  /** Vibration à l'appui : `success` pour une confirmation, `selection` pour un choix. */
  haptic?: 'success' | 'selection';
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
        background: colors.signal,
        backgroundPressed: colors.signalPressed,
        text: colors.textOnSignal,
        // En clair, le jaune se détache mal du fond : un filet d'encre dessine le bouton
        border: theme.name === 'light' ? colors.textPrimary : null,
      };
    case 'secondary':
      return {
        background: 'transparent',
        backgroundPressed: colors.surfaceMuted,
        text: colors.textPrimary,
        border: colors.borderStrong,
      };
    case 'ghost':
      return {
        background: 'transparent',
        backgroundPressed: colors.surfaceMuted,
        text: colors.signalText,
        border: null,
      };
    case 'danger':
      return {
        background: colors.danger,
        backgroundPressed: colors.dangerText,
        text: colors.textOnDanger,
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
  haptic,
  style,
  testID,
}: ButtonProps) => {
  const theme = useTheme();
  const label = useTextStyle('label');
  const feedback = usePressFeedback();
  const [pressed, setPressed] = useState(false);
  const palette = variantColors(theme, variant);
  const inactive = disabled || loading;
  const small = size === 'sm';

  const handlePress = () => {
    if (haptic) {
      haptics[haptic]();
    }
    onPress();
  };

  return (
    <AnimatedPressable
      onPress={handlePress}
      onPressIn={() => {
        setPressed(true);
        feedback.onPressIn();
      }}
      onPressOut={() => {
        setPressed(false);
        feedback.onPressOut();
      }}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityState={{ disabled: inactive, busy: loading }}
      accessibilityLabel={title}
      testID={testID}
      style={[
        styles.base,
        {
          minHeight: small ? MIN_TOUCH_TARGET : MIN_TOUCH_TARGET + 8,
          paddingHorizontal: small ? theme.spacing.base : theme.spacing.lg,
          borderRadius: theme.radius.md,
          backgroundColor: pressed ? palette.backgroundPressed : palette.background,
          borderWidth: palette.border ? 1.5 : 0,
          borderColor: palette.border ?? 'transparent',
        },
        fullWidth && styles.fullWidth,
        // Un bouton inactif reste lisible : on baisse l'opacité, on ne change pas la couleur
        inactive && styles.inactive,
        feedback.style,
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
            style={[
              label,
              {
                color: palette.text,
                fontSize: small ? 14 : 17,
                lineHeight: small ? 18 : 22,
                letterSpacing: label.letterSpacing ? 1 : 0,
              },
            ]}
            numberOfLines={1}
          >
            {title}
          </Text>
          {icon && iconPosition === 'trailing' ? (
            <Ionicons name={icon} size={small ? 16 : 18} color={palette.text} />
          ) : null}
        </View>
      )}
    </AnimatedPressable>
  );
};

const styles = StyleSheet.create({
  base: { alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center' },
  fullWidth: { alignSelf: 'stretch' },
  inactive: { opacity: 0.45 },
});
