/**
 * Cloche des notifications (17.7, D-66), dans la barre des deux accueils : le nombre de non lues
 * (N3 `?unread=true`, « 50+ » au-delà de la page) et l'accès à l'historique.
 *
 * Le compte se relit à chaque retour sur l'accueil (on revient souvent de l'historique, où l'on
 * vient d'en lire) et à chaque notification reçue app ouverte. Une lecture ratée laisse la
 * cloche sans badge : jamais d'erreur affichée pour un compteur.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import * as Notifications from 'expo-notifications';
import { useTheme } from '../context/ThemeContext';
import { useI18n } from '../context/LanguageContext';
import { useTextStyle } from '../theme';
import { notificationService } from '../services/api/NotificationService';
import { unreadBadge } from '../models/Notification';
import { MIN_TOUCH_TARGET } from '../theme/tokens';

interface NotificationBellProps {
  onPress: () => void;
}

export const NotificationBell = ({ onPress }: NotificationBellProps) => {
  const theme = useTheme();
  const { t } = useI18n();
  const labelStyle = useTextStyle('label');
  const [count, setCount] = useState(0);

  const refresh = useCallback(() => {
    notificationService
      .getMine(true)
      .then((items) => setCount(items.length))
      .catch(() => undefined);
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  // Une notification reçue pendant que l'app est ouverte change le compte tout de suite.
  useEffect(() => {
    const subscription = Notifications.addNotificationReceivedListener(() => refresh());
    return () => subscription.remove();
  }, [refresh]);

  const badge = unreadBadge(count);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={
        badge ? t('notifications.bellUnread', { count: badge }) : t('notifications.title')
      }
      hitSlop={4}
      testID="notification-bell"
      style={({ pressed }) => [
        styles.square,
        {
          borderRadius: theme.radius.md,
          borderColor: theme.colors.border,
          backgroundColor: pressed ? theme.colors.surfaceMuted : theme.colors.surfaceRaised,
        },
      ]}
    >
      <Ionicons
        name={badge ? 'notifications' : 'notifications-outline'}
        size={22}
        color={theme.colors.textPrimary}
      />
      {badge ? (
        <View
          style={[styles.badge, { backgroundColor: theme.colors.danger }]}
          testID="notification-badge"
        >
          <Text style={[labelStyle, styles.badgeText, { color: theme.colors.textOnDanger }]}>
            {badge}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  square: {
    width: MIN_TOUCH_TARGET,
    height: MIN_TOUCH_TARGET,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -4,
    end: -4,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { fontSize: 11, lineHeight: 14, letterSpacing: 0 },
});
