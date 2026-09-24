/**
 * Onglet « Examens » de Mon profil (11.3) — P10 : l'historique des examens, leur résultat et leur
 * règlement. Les libellés viennent des modèles (D-18, D-42) et des catalogues (D-47).
 */

import React, { useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { studentSelfProfileService } from '../../../../services/api/StudentSelfProfileService';
import { getApiErrorMessage } from '../../../../services/api/ApiError';
import { ExamHistory } from '../../../../models/Profile';
import { examResultLabel, examTypeLabel, ExamResult, ExamType } from '../../../../models/Exam';
import { useSchoolCurrency } from '../../../../hooks/useSchoolCurrency';
import { useI18n } from '../../../../context/LanguageContext';
import { useTheme } from '../../../../context/ThemeContext';
import { Badge, Card, EmptyState, SkeletonCard, Tone } from '../../../../components/ui';
import { formatAmount, formatDate, formatDateTime } from '../../../../utils/format';
import { Theme } from '../../../../theme';
import { IoniconName } from '../../../../utils/rtl';

const resultTone = (result: string): Tone => {
  switch (result) {
    case ExamResult.PASSED:
      return 'success';
    case ExamResult.FAILED:
      return 'danger';
    default:
      return 'warning';
  }
};

const resultIcon = (result: string): IoniconName => {
  switch (result) {
    case ExamResult.PASSED:
      return 'checkmark-circle';
    case ExamResult.FAILED:
      return 'close-circle';
    default:
      return 'help-circle';
  }
};

export const MyExamsPaymentTab = ({ route }: any) => {
  const { t } = useI18n();
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { schoolId } = route.params;
  const currency = useSchoolCurrency(schoolId);
  const [loading, setLoading] = useState(true);
  const [exams, setExams] = useState<ExamHistory[]>([]);

  useEffect(() => {
    loadExams();
  }, [schoolId]);

  const loadExams = async () => {
    try {
      setLoading(true);
      const data = await studentSelfProfileService.getMyExams(schoolId);
      setExams(data);
    } catch (error) {
      Alert.alert(t('common.error'), getApiErrorMessage(error, t('myExams.loadFailed')));
    } finally {
      setLoading(false);
    }
  };

  const renderExam = ({ item }: { item: ExamHistory }) => {
    const tone = resultTone(item.result);
    const resultColor =
      tone === 'success'
        ? theme.colors.successText
        : tone === 'danger'
          ? theme.colors.dangerText
          : theme.colors.warningText;

    return (
      <Card style={styles.card}>
        <View style={styles.info}>
          <Text style={styles.type}>
            {t('myExams.examSuffix', {
              type: examTypeLabel(item.type as ExamType) ?? item.type,
            })}
            {item.status === 'cancelled' ? t('common.cancelledSuffix') : ''}
          </Text>
          <Text style={styles.date}>
            {formatDateTime(item.dateTime)}
            {item.location ? ` · ${item.location}` : ''}
          </Text>
        </View>

        {item.result !== ExamResult.PENDING ? (
          <View style={styles.result}>
            <Ionicons name={resultIcon(item.result)} size={24} color={resultColor} />
            <View style={styles.resultBody}>
              <Text style={[styles.resultText, { color: resultColor }]}>
                {examResultLabel(item.result as ExamResult) ?? item.result}
              </Text>
              {item.score !== null ? (
                <Text style={styles.score}>
                  {t('myExams.score')} {item.score}/100
                </Text>
              ) : null}
            </View>
          </View>
        ) : null}

        {item.notes ? (
          <View style={styles.quote}>
            <Text style={styles.quoteLabel}>{t('profile.notes')}</Text>
            <Text style={styles.quoteText}>{item.notes}</Text>
          </View>
        ) : null}

        <View style={styles.payment}>
          <View style={styles.paymentRow}>
            <View style={styles.paymentLabel}>
              <Ionicons
                name={item.paid ? 'checkmark-circle' : 'alert-circle-outline'}
                size={20}
                color={item.paid ? theme.colors.successText : theme.colors.warningText}
              />
              <Text style={styles.paymentLabelText}>
                {item.paid ? t('profile.paid') : t('profile.pendingPayment')}
              </Text>
            </View>
            {item.amount !== null || item.price !== null ? (
              <Badge
                label={formatAmount(item.amount ?? item.price, currency)}
                tone={item.paid ? 'success' : 'warning'}
              />
            ) : null}
          </View>
          {item.paid && item.paymentDate ? (
            <Text style={styles.note}>
              {t('profile.paidOn', { date: formatDate(item.paymentDate) })}
            </Text>
          ) : null}
        </View>
      </Card>
    );
  };

  if (loading) {
    return (
      <View style={styles.skeletons}>
        <SkeletonCard lines={3} />
        <SkeletonCard lines={3} />
      </View>
    );
  }

  return (
    <FlatList
      data={exams}
      renderItem={renderExam}
      keyExtractor={(item) => item.id}
      style={styles.flex}
      contentContainerStyle={exams.length === 0 ? styles.emptyList : styles.listContent}
      ListEmptyComponent={
        <EmptyState icon="ribbon-outline" title={t('profile.noExams')} tone="neutral" />
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
    info: { gap: 2 },
    type: {
      fontSize: theme.typography.size.base,
      fontWeight: theme.typography.weight.semibold,
      color: theme.colors.textPrimary,
    },
    date: { fontSize: theme.typography.size.sm, color: theme.colors.textSecondary },
    result: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md },
    resultBody: { flex: 1, gap: 2 },
    resultText: {
      fontSize: theme.typography.size.base,
      fontWeight: theme.typography.weight.semibold,
    },
    score: { fontSize: theme.typography.size.sm, color: theme.colors.textSecondary },
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
    note: { fontSize: theme.typography.size.xs, color: theme.colors.textSecondary },
  });
