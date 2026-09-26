/**
 * `AppBar` (11.2, refaite en 13.5 — D-52) — en-tête d'écran posé sur le fond, séparé par un
 * filet : retour, surtitre, titre, action, avatar. Titre en capitales condensées (rôle `title`)
 * sur un accueil (`large`), en `heading` ailleurs ; sur un accueil, le surtitre prend la couleur
 * signal (« TABLEAU DE BORD »). L'avatar (initiales) ouvre les Réglages (13.3).
 * Le bouton retour suit le sens de lecture (`mirrorIcon`, D-47) et respecte la cible tactile.
 */

import React from 'react';
import { Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useTextStyle } from '../../theme';
import { MIN_TOUCH_TARGET } from '../../theme/tokens';
import { mirrorIcon } from '../../utils/rtl';

interface AppBarAvatar {
  /** Une ou deux lettres. */
  initials: string;
  onPress: () => void;
  /** Libellé lu par les lecteurs d'écran (« Ouvrir les réglages »), traduit par l'appelant. */
  label: string;
}

interface AppBarProps {
  title: string;
  subtitle?: string;
  /** Affiche le bouton retour. */
  onBack?: () => void;
  /** Libellé lu par les lecteurs d'écran pour le retour (traduit par l'appelant). */
  backLabel?: string;
  /** Action à droite : icône, `Button` compact, menu. */
  right?: React.ReactNode;
  /** Avatar à droite, qui ouvre les Réglages. */
  avatar?: AppBarAvatar;
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
  avatar,
  large = false,
  topInset = true,
  style,
  testID,
}: AppBarProps) => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const titleStyle = useTextStyle(large ? 'title' : 'heading');
  const kickerStyle = useTextStyle('label');

  return (
    <View
      testID={testID}
      style={[
        styles.root,
        {
          backgroundColor: theme.colors.surface,
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
          style={({ pressed }) => [
            styles.square,
            { borderColor: theme.colors.border, borderRadius: theme.radius.md },
            pressed && { backgroundColor: theme.colors.surfaceMuted },
          ]}
        >
          <Ionicons name={mirrorIcon('arrow-back')} size={22} color={theme.colors.textPrimary} />
        </Pressable>
      ) : null}

      <View style={styles.titles}>
        {subtitle ? (
          <Text
            style={[
              kickerStyle,
              { color: large ? theme.colors.signalText : theme.colors.textSecondary },
            ]}
            numberOfLines={1}
          >
            {subtitle}
          </Text>
        ) : null}
        <Text
          style={[titleStyle, { color: theme.colors.textPrimary }]}
          numberOfLines={1}
          accessibilityRole="header"
        >
          {title}
        </Text>
      </View>

      {right}

      {avatar ? (
        <Pressable
          onPress={avatar.onPress}
          accessibilityRole="button"
          accessibilityLabel={avatar.label}
          hitSlop={4}
          testID="appbar-avatar"
          style={({ pressed }) => [
            styles.square,
            {
              borderRadius: theme.radius.pill,
              borderColor: theme.colors.gauge,
              backgroundColor: pressed ? theme.colors.signalSoft : theme.colors.surfaceRaised,
            },
          ]}
        >
          <Text style={[kickerStyle, styles.initials, { color: theme.colors.textPrimary }]}>
            {avatar.initials}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  square: {
    minWidth: MIN_TOUCH_TARGET,
    minHeight: MIN_TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  titles: { flex: 1 },
  initials: { fontSize: 15, lineHeight: 18, letterSpacing: 0.5 },
});
