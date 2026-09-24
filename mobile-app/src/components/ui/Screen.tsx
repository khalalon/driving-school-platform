/**
 * `Screen` (11.2) — le cadre de tout écran : fond du thème, zone sûre, marges latérales et
 * défilement. Les écrans n'ont plus à redéclarer `flex: 1` + `backgroundColor` + `padding`.
 */

import React from 'react';
import {
  RefreshControlProps,
  ScrollView,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import { Edge, SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';

interface ScreenProps {
  children: React.ReactNode;
  /** Contenu défilant (par défaut) ou hauteur fixe (listes `FlatList`, cartes plein écran). */
  scroll?: boolean;
  /** Marges latérales standard. */
  padded?: boolean;
  /** Bords protégés ; `['top']` suffit quand une barre d'onglets occupe le bas. */
  edges?: readonly Edge[];
  refreshControl?: React.ReactElement<RefreshControlProps>;
  /** Barre d'actions collée en bas, hors du défilement. */
  footer?: React.ReactNode;
  contentContainerStyle?: StyleProp<ViewStyle>;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export const Screen = ({
  children,
  scroll = true,
  padded = true,
  edges = ['top'],
  refreshControl,
  footer,
  contentContainerStyle,
  style,
  testID,
}: ScreenProps) => {
  const theme = useTheme();
  const padding = padded
    ? { paddingHorizontal: theme.spacing.base, paddingBottom: theme.spacing.xl }
    : null;

  return (
    <SafeAreaView
      edges={edges}
      style={[styles.root, { backgroundColor: theme.colors.surface }, style]}
      testID={testID}
    >
      {scroll ? (
        <ScrollView
          style={styles.flex}
          contentContainerStyle={[styles.content, padding, contentContainerStyle]}
          refreshControl={refreshControl}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.flex, padding, contentContainerStyle]}>{children}</View>
      )}
      {footer ? (
        <View
          style={[
            styles.footer,
            {
              backgroundColor: theme.colors.surfaceRaised,
              borderTopColor: theme.colors.border,
              padding: theme.spacing.base,
            },
          ]}
        >
          {footer}
        </View>
      ) : null}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  content: { flexGrow: 1 },
  footer: { borderTopWidth: StyleSheet.hairlineWidth },
});
