/**
 * Notifications (17.7, D-66) — l'historique, commun aux deux rôles : N3 pour la liste, N4 quand
 * on en ouvre une, N5 pour tout marquer lu. Le texte arrive déjà rendu par le serveur dans la
 * langue de l'appareil (D-47) ; l'écran ne traduit que son propre cadre.
 *
 * Toucher une notification la marque lue **puis** ouvre sa destination, la même que le push
 * (`routeForTarget`) ; sans destination, elle se marque lue et reste ici.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { Alert, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { useI18n } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
import { AppBar, Button, EmptyState, SkeletonCard } from '../../components/ui';
import { notificationService } from '../../services/api/NotificationService';
import { getApiErrorMessage } from '../../services/api/ApiError';
import { AppNotification } from '../../models/Notification';
import { routeForTarget } from '../../navigation/notificationRoutes';
import { formatDateTime } from '../../utils/format';
import { MIN_TOUCH_TARGET } from '../../theme/tokens';
import { Theme, textStyle } from '../../theme';
import type { Language } from '../../i18n';
import { IoniconName } from '../../utils/rtl';

/** Icône par famille d'événement (D-63) ; le texte, lui, vient du serveur. */
const iconFor = (type: string): IoniconName => {
  if (type.startsWith('exam')) return 'ribbon-outline';
  if (type.startsWith('enrollment')) return 'school-outline';
  if (type === 'lesson_reminder') return 'alarm-outline';
  return 'car-outline';
};

export const NotificationsScreen = ({ navigation }: any) => {
  const { t, language } = useI18n();
  const { user } = useAuth();
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme, language), [theme, language]);

  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      setItems(await notificationService.getMine());
    } catch (err) {
      setError(getApiErrorMessage(err, t('notifications.loadFailed')));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const open = async (item: AppNotification) => {
    if (!item.read) {
      // Lu tout de suite à l'écran ; le serveur suit (N4), une erreur n'empêche pas d'ouvrir.
      setItems((current) => current.map((n) => (n.id === item.id ? { ...n, read: true } : n)));
      notificationService.markRead(item.id).catch(() => undefined);
    }
    if (item.data) {
      const { name, params } = routeForTarget(item.data, user);
      if (name !== 'Notifications') {
        navigation.navigate(name, params);
      }
    }
  };

  const markAll = async () => {
    try {
      await notificationService.markAllRead();
      setItems((current) => current.map((n) => ({ ...n, read: true })));
    } catch (err) {
      Alert.alert(t('common.error'), getApiErrorMessage(err, t('notifications.markAllFailed')));
    }
  };

  const unread = items.filter((n) => !n.read).length;

  const renderItem = ({ item }: { item: AppNotification }) => (
    <Pressable
      onPress={() => open(item)}
      accessibilityRole="button"
      accessibilityLabel={`${item.read ? '' : `${t('notifications.unread')}, `}${item.title}. ${item.message}`}
      testID={`notification-${item.id}`}
      style={({ pressed }) => [
        styles.row,
        !item.read && styles.rowUnread,
        pressed && { backgroundColor: theme.colors.surfaceMuted },
      ]}
    >
      <View style={[styles.icon, !item.read && styles.iconUnread]}>
        <Ionicons
          name={iconFor(item.type)}
          size={20}
          color={item.read ? theme.colors.textMuted : theme.colors.signalText}
        />
      </View>
      <View style={styles.texts}>
        <View style={styles.titleRow}>
          <Text style={[styles.title, !item.read && styles.titleUnread]} numberOfLines={1}>
            {item.title}
          </Text>
          {!item.read ? <View style={styles.dot} testID={`unread-${item.id}`} /> : null}
        </View>
        <Text style={styles.message}>{item.message}</Text>
        <Text style={styles.date}>{formatDateTime(item.createdAt)}</Text>
      </View>
    </Pressable>
  );

  const renderBody = () => {
    if (loading) {
      return (
        <View style={styles.skeletons}>
          <SkeletonCard lines={2} />
          <SkeletonCard lines={2} />
          <SkeletonCard lines={2} />
        </View>
      );
    }
    if (error) {
      return (
        <EmptyState
          icon="cloud-offline-outline"
          title={t('notifications.loadFailed')}
          message={error}
          tone="danger"
          action={{ label: t('common.retry'), onPress: load }}
        />
      );
    }
    return (
      <FlatList
        data={items}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={items.length === 0 ? styles.emptyList : styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListHeaderComponent={
          unread > 0 ? (
            <View style={styles.header}>
              <Text style={styles.headerText}>
                {t('notifications.unreadCount', { count: unread })}
              </Text>
              <Button
                title={t('notifications.markAllRead')}
                onPress={markAll}
                variant="ghost"
                size="sm"
                icon="checkmark-done-outline"
              />
            </View>
          ) : null
        }
        ListEmptyComponent={
          <EmptyState
            icon="notifications-off-outline"
            title={t('notifications.empty')}
            message={t('notifications.emptyText')}
            tone="neutral"
          />
        }
      />
    );
  };

  return (
    <View style={styles.flex}>
      <AppBar
        title={t('notifications.title')}
        onBack={() => navigation.goBack()}
        backLabel={t('common.back')}
      />
      {renderBody()}
    </View>
  );
};

const createStyles = (theme: Theme, language: Language) =>
  StyleSheet.create({
    flex: { flex: 1, backgroundColor: theme.colors.surface },
    skeletons: { padding: theme.spacing.base, gap: theme.spacing.md },
    list: { paddingVertical: theme.spacing.sm },
    emptyList: { flexGrow: 1, justifyContent: 'center' },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: theme.spacing.base,
      paddingBottom: theme.spacing.sm,
      gap: theme.spacing.sm,
    },
    headerText: { ...textStyle('label', language), color: theme.colors.textSecondary, flex: 1 },
    row: {
      flexDirection: 'row',
      gap: theme.spacing.md,
      paddingHorizontal: theme.spacing.base,
      paddingVertical: theme.spacing.md,
      minHeight: MIN_TOUCH_TARGET,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    rowUnread: { backgroundColor: theme.colors.surfaceRaised },
    icon: {
      width: 40,
      height: 40,
      borderRadius: theme.radius.md,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.surfaceMuted,
    },
    iconUnread: { backgroundColor: theme.colors.signalSoft },
    texts: { flex: 1, gap: theme.spacing.xs },
    titleRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
    title: { ...textStyle('body', language), color: theme.colors.textPrimary, flex: 1 },
    titleUnread: { ...textStyle('bodyStrong', language) },
    dot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: theme.colors.signal,
    },
    message: { ...textStyle('caption', language), color: theme.colors.textSecondary },
    date: { ...textStyle('caption', language), color: theme.colors.textMuted },
  });
