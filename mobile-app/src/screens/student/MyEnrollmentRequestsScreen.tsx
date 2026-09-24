/**
 * Mes demandes d'inscription (11.3) — E3 : où en est chaque demande, et pourquoi quand elle a
 * été refusée. Le statut devient un `Badge` d'intention (en attente, approuvée, refusée) : plus
 * de correspondance couleur écrite dans l'écran.
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Alert, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { enrollmentService } from '../../services/api/EnrollmentService';
import { getApiErrorMessage } from '../../services/api/ApiError';
import { useI18n } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
import { AppBar, Badge, Button, Card, EmptyState, SkeletonCard, Tone } from '../../components/ui';
import { EnrollmentRequest, EnrollmentStatus } from '../../models/Enrollment';
import { formatDate } from '../../utils/format';
import { Theme } from '../../theme';
import { mirrorIcon } from '../../utils/rtl';

export const MyEnrollmentRequestsScreen = ({ navigation }: any) => {
  const { t } = useI18n();
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [requests, setRequests] = useState<EnrollmentRequest[]>([]);

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    try {
      setLoading(true);
      const data = await enrollmentService.getMyRequests();
      setRequests(data);
    } catch (error) {
      Alert.alert(t('common.error'), getApiErrorMessage(error, t('enrollmentRequests.loadFailed')));
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadRequests();
    setRefreshing(false);
  }, []);

  /** Statut → intention de couleur et libellé traduit. */
  const statusBadge = (status: EnrollmentStatus): { tone: Tone; label: string } => {
    switch (status) {
      case EnrollmentStatus.PENDING:
        return { tone: 'warning', label: t('enrollmentRequests.pending') };
      case EnrollmentStatus.APPROVED:
        return { tone: 'success', label: t('enrollmentRequests.approved') };
      case EnrollmentStatus.REJECTED:
        return { tone: 'danger', label: t('enrollmentRequests.rejected') };
    }
  };

  const renderRequestCard = ({ item }: { item: EnrollmentRequest }) => {
    const badge = statusBadge(item.status);

    return (
      <Card style={styles.card}>
        <View style={styles.head}>
          <View style={styles.schoolInfo}>
            <Text style={styles.schoolName}>{item.schoolName}</Text>
            {item.schoolAddress ? (
              <View style={styles.metaRow}>
                <Ionicons name="location-outline" size={14} color={theme.colors.textMuted} />
                <Text style={styles.meta} numberOfLines={1}>
                  {item.schoolAddress}
                </Text>
              </View>
            ) : null}
          </View>
          <Badge label={badge.label} tone={badge.tone} dot />
        </View>

        {item.message ? (
          <View style={styles.quote}>
            <Text style={styles.quoteLabel}>{t('enrollmentRequests.yourMessage')}</Text>
            <Text style={styles.quoteText}>{item.message}</Text>
          </View>
        ) : null}

        {item.status === EnrollmentStatus.REJECTED && item.rejectionReason ? (
          <View style={styles.reason}>
            <Ionicons name="information-circle" size={20} color={theme.colors.dangerText} />
            <View style={styles.reasonBody}>
              <Text style={styles.reasonLabel}>{t('enrollmentRequests.reason')}</Text>
              <Text style={styles.reasonText}>{item.rejectionReason}</Text>
            </View>
          </View>
        ) : null}

        <View style={styles.footer}>
          <Text style={styles.date}>{formatDate(item.createdAt)}</Text>
          <Button
            title={t('enrollmentRequests.viewSchool')}
            onPress={() => navigation.navigate('SchoolDetail', { schoolId: item.schoolId })}
            variant="ghost"
            size="sm"
            icon={mirrorIcon('arrow-forward')}
            iconPosition="trailing"
          />
        </View>
      </Card>
    );
  };

  return (
    <View style={styles.flex}>
      <AppBar
        title={t('enrollmentRequests.title')}
        onBack={() => navigation.goBack()}
        backLabel={t('common.back')}
      />

      {loading && requests.length === 0 ? (
        <View style={styles.skeletons}>
          <SkeletonCard lines={3} />
          <SkeletonCard lines={3} />
        </View>
      ) : (
        <FlatList
          data={requests}
          renderItem={renderRequestCard}
          keyExtractor={(item) => item.id}
          contentContainerStyle={requests.length === 0 ? styles.emptyList : styles.listContent}
          ListEmptyComponent={
            <EmptyState
              icon="document-text-outline"
              title={t('enrollmentRequests.emptyTitle')}
              message={t('enrollmentRequests.emptyText')}
              action={{
                label: t('enrollmentRequests.browse'),
                onPress: () => navigation.navigate('SchoolsList'),
              }}
            />
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[theme.colors.accent]}
              tintColor={theme.colors.accent}
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    flex: { flex: 1, backgroundColor: theme.colors.surface },
    skeletons: { padding: theme.spacing.base, gap: theme.spacing.md },
    listContent: { padding: theme.spacing.base, gap: theme.spacing.md },
    emptyList: { flexGrow: 1, justifyContent: 'center' },
    card: { gap: theme.spacing.md },
    head: { flexDirection: 'row', alignItems: 'flex-start', gap: theme.spacing.sm },
    schoolInfo: { flex: 1, gap: 2 },
    schoolName: {
      fontSize: theme.typography.size.base,
      fontWeight: theme.typography.weight.semibold,
      color: theme.colors.textPrimary,
    },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs },
    meta: { flex: 1, fontSize: theme.typography.size.sm, color: theme.colors.textMuted },
    quote: {
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: theme.radius.md,
      padding: theme.spacing.md,
      gap: theme.spacing.xs,
    },
    quoteLabel: {
      fontSize: theme.typography.size.xs,
      color: theme.colors.textMuted,
      fontWeight: theme.typography.weight.medium,
    },
    quoteText: { fontSize: theme.typography.size.sm, color: theme.colors.textSecondary },
    reason: {
      flexDirection: 'row',
      gap: theme.spacing.sm,
      backgroundColor: theme.colors.dangerSoft,
      borderRadius: theme.radius.md,
      padding: theme.spacing.md,
    },
    reasonBody: { flex: 1, gap: 2 },
    reasonLabel: {
      fontSize: theme.typography.size.xs,
      fontWeight: theme.typography.weight.semibold,
      color: theme.colors.dangerText,
    },
    reasonText: { fontSize: theme.typography.size.sm, color: theme.colors.dangerText },
    footer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.border,
      paddingTop: theme.spacing.sm,
    },
    date: { fontSize: theme.typography.size.xs, color: theme.colors.textMuted },
  });
