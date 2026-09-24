/**
 * `AppBar` (11.2) — en-tête d'écran : retour, titre, sous-titre, action. Le bouton retour suit le
 * sens de lecture (`mirrorIcon`, D-47) et respecte la cible tactile minimale.
 */

import React from 'react';
import { Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { MIN_TOUCH_TARGET } from '../../theme/tokens';
import { mirrorIcon } from '../../utils/rtl';

interface AppBarProps {
  title: string;
  subtitle?: string;
  /** Affiche le bouton retour. */
  onBack?: () => void;
  /** Libellé lu par les lecteurs d'écran pour le retour (traduit par l'appelant). */
  backLabel?: string;
  /** Action à droite : icône, `Button` compact, menu. */
  right?: React.ReactNode;
  /** Titre plus grand, pour un accueil. */
  large?: boolean;
  /** La barre occupe le haut de l'écran et protège donc la zone d'état ; `false` si elle est
   *  posée sous un en-tête de navigation. */
  topInset?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export const AppBar = ({
  title,
  subtitle,
  onBack,
  backLabel,
  right,
  large = false,
  topInset = true,
  style,
  testID,
}: AppBarProps) => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      testID={testID}
      style={[
        styles.root,
        {
          backgroundColor: theme.colors.surfaceRaised,
          borderBottomColor: theme.colors.border,
          paddingHorizontal: theme.spacing.base,
          paddingTop: (topInset ? insets.top : 0) + theme.spacing.md,
          paddingBottom: theme.spacing.md,
          gap: theme.spacing.md,
        },
        style,
      ]}
    >
      {onBack ? (
        <Pressable
          onPress={onBack}
          accessibilityRole="button"
          accessibilityLabel={backLabel ?? title}
          hitSlop={8}
          style={({ pressed }) => [styles.back, pressed && styles.pressed]}
        >
          <Ionicons name={mirrorIcon('arrow-back')} size={22} color={theme.colors.textPrimary} />
        </Pressable>
      ) : null}

      <View style={styles.titles}>
        {subtitle ? (
          <Text
            style={{ color: theme.colors.textSecondary, fontSize: theme.typography.size.sm }}
            numberOfLines={1}
          >
            {subtitle}
          </Text>
        ) : null}
        <Text
          style={{
            color: theme.colors.textPrimary,
            fontSize: large ? theme.typography.size['2xl'] : theme.typography.size.lg,
            fontWeight: theme.typography.weight.bold,
          }}
          numberOfLines={1}
        >
          {title}
        </Text>
      </View>

      {right}
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  back: {
    minWidth: MIN_TOUCH_TARGET - 8,
    minHeight: MIN_TOUCH_TARGET - 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titles: { flex: 1 },
  pressed: { opacity: 0.6 },
});
