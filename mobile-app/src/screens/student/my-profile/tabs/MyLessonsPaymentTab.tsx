/**
 * Onglet « Leçons » de Mon profil (11.3) — P9 : l'historique des leçons avec leur règlement.
 * Une absence n'est pas facturée (D-41) et un versement rendu revient en avoir (D-40) : la carte
 * le dit sous le montant plutôt que de laisser l'élève deviner.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { studentSelfProfileService } from '../../../../services/api/StudentSelfProfileService';
import { getApiErrorMessage } from '../../../../services/api/ApiError';
import { LessonHistory, paymentMethodLabel } from '../../../../models/Profile';
import { lessonTypeLabel } from '../../../../models/Lesson';
import { useSchoolCurrency } from '../../../../hooks/useSchoolCurrency';
import { useI18n } from '../../../../context/LanguageContext';
import { useTheme } from '../../../../context/ThemeContext';
import { Badge, Card, EmptyState, SkeletonCard } from '../../../../components/ui';
import { formatAmount, formatDate, formatDateTime } from '../../../../utils/format';
import { Theme } from '../../../../theme';

export const MyLessonsPaymentTab = ({ route }: any) => {
  const { t } = useI18n();
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { schoolId } = route.params;
  const currency = useSchoolCurrency(schoolId);
  const [loading, setLoading] = useState(true);
  const [lessons, setLessons] = useState<LessonHistory[]>([]);

  useEffect(() => {
    loadLessons();
  }, [schoolId]);

  const loadLessons = async () => {
    try {
      setLoading(true);
      const data = await studentSelfProfileService.getMyLessons(schoolId);
      setLessons(data);
    } catch (error) {
      Alert.alert(t('common.error'), getApiErrorMessage(error, t('myLessons.loadFailed')));
    } finally {
      setLoading(false);
    }
  };

  const renderLesson = ({ item }: { item: LessonHistory }) => {
    const notBilled = item.attended === false && !item.paid;
    const instructor = `${item.instructorFirstName} ${item.instructorLastName}`.trim();

    return (
      <Card style={styles.card}>
        <View style={styles.head}>
          <View style={styles.info}>
            <Text style={styles.type}>
              {lessonTypeLabel(item.type) ?? item.type}
              {item.status === 'cancelled' ? t('common.cancelledSuffix') : ''}
            </Text>
            <Text style={styles.date}>{formatDateTime(item.scheduledDate)}</Text>
          </View>
          {item.attended !== null ? (
            <Badge
              label={item.attended ? t('profile.attended') : t('profile.missedNotBilled')}
              tone={item.attended ? 'success' : 'danger'}
            />
          ) : null}
        </View>

        <View style={styles.details}>
          <View style={styles.metaRow}>
            <Ionicons name="person-outline" size={16} color={theme.colors.textMuted} />
            <Text style={styles.meta}>{instructor || t('format.empty')}</Text>
          </View>
          <View style={styles.metaRow}>
            <Ionicons name="time-outline" size={16} color={theme.colors.textMuted} />
            <Text style={styles.meta}>
              {item.durationMinutes
                ? t('format.minutes', { count: item.durationMinutes })
                : t('format.empty')}
            </Text>
          </View>
        </View>

        {item.feedback ? (
          <View style={styles.quote}>
            <Text style={styles.quoteLabel}>{t('profile.feedback')}</Text>
            <Text style={styles.quoteText}>{item.feedback}</Text>
          </View>
        ) : null}

        {item.rating ? (
          <View style={styles.rating}>
            {[1, 2, 3, 4, 5].map((star) => (
              <Ionicons
                key={star}
                name={star <= item.rating! ? 'star' : 'star-outline'}
                size={16}
                color={theme.colors.warning}
              />
            ))}
          </View>
        ) : null}

        <View style={styles.payment}>
          <View style={styles.paymentRow}>
            <View style={styles.paymentLabel}>
              <Ionicons
                name={
                  notBilled
                    ? 'remove-circle-outline'
                    : item.paid
                      ? 'checkmark-circle'
                      : 'alert-circle-outline'
                }
                size={20}
                color={
                  notBilled
                    ? theme.colors.textMuted
                    : item.paid
                      ? theme.colors.successText
                      : theme.colors.warningText
                }
              />
              <Text style={styles.paymentLabelText}>
                {notBilled
                  ? t('profile.notBilled')
                  : item.paid
                    ? t('profile.paid')
                    : t('profile.pendingPayment')}
              </Text>
            </View>
            {item.amount !== null || item.price !== null ? (
              <Text
                style={[
                  styles.amount,
                  { color: item.paid ? theme.colors.successText : theme.colors.warningText },
                ]}
              >
                {formatAmount(item.amount ?? item.price, currency)}
              </Text>
            ) : null}
          </View>

          {item.paid && item.paymentDate ? (
            <Text style={styles.note}>
              {t('profile.paidOn', { date: formatDate(item.paymentDate) })}
              {item.paymentMethod === 'credit' ? t('profile.withYourCredit') : ''}
              {item.paymentMethod && item.paymentMethod !== 'credit'
                ? ` (${paymentMethodLabel(item.paymentMethod)})`
                : ''}
            </Text>
          ) : null}
          {!item.paid && item.creditApplied > 0 ? (
            <Text style={styles.note}>
              {t('profile.creditApplied', { amount: formatAmount(item.creditApplied, currency) })}
            </Text>
          ) : null}
          {item.attended === false && (item.paid || item.creditApplied > 0) ? (
            <Text style={styles.note}>{t('profile.refundedAsCredit')}</Text>
          ) : null}
        </View>
      </Card>
    );
  };

  if (loading) {
    return (
      <View style={styles.skeletons}>
        <SkeletonCard lines={4} />
        <SkeletonCard lines={4} />
      </View>
    );
  }

  return (
    <FlatList
      data={lessons}
      renderItem={renderLesson}
      keyExtractor={(item) => item.id}
      style={styles.flex}
      contentContainerStyle={lessons.length === 0 ? styles.emptyList : styles.listContent}
      ListEmptyComponent={
        <EmptyState icon="calendar-outline" title={t('profile.noLessons')} tone="neutral" />
      }
      showsVerticalScrollIndicator={false}
    />
  );
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    flex: { flex: 1, backgroundColor: theme.colors.surface },
    skeletons: {
      flex: 1,
      backgroundColor: theme.colors.surface,
      padding: theme.spacing.base,
      gap: theme.spacing.md,
    },
    listContent: { padding: theme.spacing.base, gap: theme.spacing.md },
    emptyList: { flexGrow: 1, justifyContent: 'center' },
    card: { gap: theme.spacing.sm },
    head: { flexDirection: 'row', alignItems: 'flex-start', gap: theme.spacing.sm },
    info: { flex: 1, gap: 2 },
    type: {
      fontSize: theme.typography.size.base,
      fontWeight: theme.typography.weight.semibold,
      color: theme.colors.textPrimary,
    },
    date: { fontSize: theme.typography.size.sm, color: theme.colors.textSecondary },
    details: { gap: theme.spacing.xs },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs },
    meta: { fontSize: theme.typography.size.sm, color: theme.colors.textSecondary },
    quote: {
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: theme.radius.md,
      padding: theme.spacing.md,
      gap: theme.spacing.xs,
    },
    quoteLabel: {
      fontSize: theme.typography.size.xs,
      fontWeight: theme.typography.weight.medium,
      color: theme.colors.textMuted,
    },
    quoteText: { fontSize: theme.typography.size.sm, color: theme.colors.textPrimary },
    rating: { flexDirection: 'row', gap: 2 },
    payment: {
      paddingTop: theme.spacing.sm,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.border,
      gap: theme.spacing.xs,
    },
    paymentRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: theme.spacing.sm,
    },
    paymentLabel: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs },
    paymentLabelText: {
      fontSize: theme.typography.size.sm,
      fontWeight: theme.typography.weight.medium,
      color: theme.colors.textPrimary,
    },
    amount: {
      fontSize: theme.typography.size.base,
      fontWeight: theme.typography.weight.semibold,
    },
    note: { fontSize: theme.typography.size.xs, color: theme.colors.textSecondary },
  });
