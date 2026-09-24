/**
 * `Toast` (11.2) — bandeau de confirmation : il annonce le succès sans bloquer l'écran, là où
 * `Alert.alert` obligeait à toucher « OK ». Purement présentationnel ; la file d'affichage et le
 * `useToast()` arrivent en 11.5 (`context/ToastContext`).
 */

import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
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
  success: 'checkmark-circle',
  warning: 'alert-circle',
  danger: 'close-circle',
};

export const Toast = ({ message, tone = 'success', onDismiss, testID }: ToastProps) => {
  const theme = useTheme();
  const colors = toneColors(theme, tone);
  const appear = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(appear, {
      toValue: 1,
      duration: 180,
      useNativeDriver: true,
    }).start();
  }, [appear]);

  return (
    <Animated.View
      testID={testID}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      style={[
        styles.root,
        theme.shadows.md,
        {
          backgroundColor: colors.soft,
          borderColor: colors.solid,
          borderRadius: theme.radius.md,
          padding: theme.spacing.md,
          gap: theme.spacing.sm,
          opacity: appear,
          transform: [
            { translateY: appear.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) },
          ],
        },
      ]}
    >
      <Ionicons name={TONE_ICONS[tone]} size={20} color={colors.text} />
      <Text style={[styles.message, { color: colors.text, fontSize: theme.typography.size.sm }]}>
        {message}
      </Text>
      {onDismiss ? (
        <Pressable onPress={onDismiss} accessibilityRole="button" hitSlop={12}>
          <Ionicons name="close" size={18} color={colors.text} />
        </Pressable>
      ) : (
        <View />
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  root: { flexDirection: 'row', alignItems: 'center', borderWidth: 1 },
  message: { flex: 1 },
});
