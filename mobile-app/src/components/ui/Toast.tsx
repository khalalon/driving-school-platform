/**
 * `Toast` (11.2, refait en 13.5 — D-52) — bandeau de confirmation : il annonce le succès sans
 * bloquer l'écran, là où `Alert.alert` obligeait à toucher « OK ». Surface flottante (seule
 * ombre du style à plat), filet et icône de l'intention. Il monte depuis le bas avec la durée
 * `base` des jetons de mouvement ; si « réduire les animations » est actif, il apparaît sans
 * glisser. Purement présentationnel ; la file d'affichage vit dans `context/ToastContext` (11.5).
 */

import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { useTextStyle } from '../../theme';
import { motion } from '../../theme/motion';
import { IoniconName } from '../../utils/rtl';
import { Tone, toneColors } from './tones';

interface ToastProps {
  message: string;
  tone?: Tone;
  /** Fermeture manuelle ; la fermeture automatique est gérée par le contexte (11.5). */
  onDismiss?: () => void;
  testID?: string;
}

const TONE_ICONS: Record<Tone, IoniconName> = {
  neutral: 'information-circle',
  accent: 'information-circle',
  telemetry: 'navigate-circle',
  success: 'checkmark-circle',
  warning: 'alert-circle',
  danger: 'close-circle',
};

export const Toast = ({ message, tone = 'success', onDismiss, testID }: ToastProps) => {
  const theme = useTheme();
  const reduced = useReducedMotion();
  const bodyStyle = useTextStyle('bodyStrong');
  const colors = toneColors(theme, tone);
  const appear = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reduced) {
      appear.setValue(1);
      return;
    }
    Animated.timing(appear, {
      toValue: 1,
      duration: motion.duration.base,
      useNativeDriver: true,
    }).start();
  }, [appear, reduced]);

  return (
    <Animated.View
      testID={testID}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      style={[
        styles.root,
        theme.shadows.lg,
        {
          backgroundColor: theme.colors.surfaceRaised,
          borderColor: colors.solid,
          borderRadius: theme.radius.md,
          padding: theme.spacing.md,
          gap: theme.spacing.sm,
          opacity: appear,
          transform: [
            { translateY: appear.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) },
          ],
        },
      ]}
    >
      <View
        style={[styles.icon, { backgroundColor: colors.soft, borderRadius: theme.radius.sm }]}
      >
        <Ionicons name={TONE_ICONS[tone]} size={20} color={colors.text} />
      </View>
      <Text
        style={[
          styles.message,
          bodyStyle,
          { color: theme.colors.textPrimary, fontSize: 15, lineHeight: 20 },
        ]}
      >
        {message}
      </Text>
      {onDismiss ? (
        <Pressable onPress={onDismiss} accessibilityRole="button" hitSlop={12}>
          <Ionicons name="close" size={18} color={theme.colors.textSecondary} />
        </Pressable>
      ) : (
        <View />
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  root: { flexDirection: 'row', alignItems: 'center', borderWidth: 1 },
  icon: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  message: { flex: 1 },
});
