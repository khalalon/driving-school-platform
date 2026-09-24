/**
 * Mes examens (11.3) — X1 : demandes, convocations et résultats.
 *
 * Un examen est une demande (`pending`) que l'école planifie (`scheduled`, date et centre),
 * refuse (`rejected`) ou clôt avec un résultat (`completed`) ; l'élève voit l'état de paiement.
 * Les mots dépendent du type (D-42) : théorie planifiée par l'école, pratique convoquée par la
 * session ATTT (`examProcedure`) — aucun libellé n'est écrit dans cet écran.
 */

import React, { useState, useCallback, useMemo } from 'react';
import { Alert, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { examService } from '../../services/api/ExamService';
import { getApiErrorMessage } from '../../services/api/ApiError';
import {
  examProcedure,
  examResultLabel,
  examTypeLabel,
  Exam,
  ExamResult,
  ExamStatus,
  ExamType,
  examStatusLabel,
} from '../../models/Exam';
import { useSchoolCurrency } from '../../hooks/useSchoolCurrency';
import { useI18n } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
import { AppBar, Badge, Card, Chip, EmptyState, SkeletonCard, Tone } from '../../components/ui';
import { TranslationKey } from '../../i18n';
import { formatAmount, formatDate, formatTime } from '../../utils/format';
import { Theme } from '../../theme';

type FilterType = 'pending' | 'scheduled' | 'completed' | 'closed';

const FILTERS: { key: FilterType; labelKey: TranslationKey; statuses: ExamStatus[] }[] = [
  { key: 'pending', labelKey: 'filter.pending', statuses: [ExamStatus.PENDING] },
  { key: 'scheduled', labelKey: 'filter.scheduled', statuses: [ExamStatus.SCHEDULED] },
  { key: 'completed', labelKey: 'filter.completed', statuses: [ExamStatus.COMPLETED] },
  {
    key: 'closed',
    labelKey: 'filter.closed',
    statuses: [ExamStatus.CANCELLED, ExamStatus.REJECTED],
  },
];

const statusTone = (status: ExamStatus): Tone => {
  switch (status) {
    case ExamStatus.PENDING:
      return 'warning';
    case ExamStatus.SCHEDULED:
      return 'accent';
    case ExamStatus.COMPLETED:
      return 'success';
    case ExamStatus.CANCELLED:
    case ExamStatus.REJECTED:
      return 'danger';
  }
};

export const MyExamsScreen = ({ navigation }: any) => {
  const { t } = useI18n();
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [exams, setExams] = useState<Exam[]>([]);
  const [filter, setFilter] = useState<FilterType>('pending');
  // Une seule inscription active (D-22) : tous les examens sont dans la même école
  const currency = useSchoolCurrency(exams[0]?.schoolId);

  // Onglet (8.4) : rechargé à chaque retour au premier plan
  useFocusEffect(
    useCallback(() => {
      loadExams();
    }, [])
  );

  const loadExams = async () => {
    try {
      setLoading(true);
      const data = await examService.getMyExams();
      setExams(data);
    } catch (error) {
      Alert.alert(t('common.error'), getApiErrorMessage(error, t('myExams.loadFailed')));
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadExams();
    setRefreshing(false);
  }, []);

  const activeFilter = FILTERS.find((f) => f.key === filter) ?? FILTERS[0];
  const filteredExams = exams.filter((exam) => activeFilter.statuses.includes(exam.status));

  const renderExamCard = ({ item }: { item: Exam }) => {
    const theory = item.type === ExamType.THEORY;
    const procedure = examProcedure(item.type);
    const rejected = item.status === ExamStatus.REJECTED;

    return (
      <Card style={styles.card}>
        <View style={styles.head}>
          <View style={[styles.icon, theory ? styles.iconTheory : styles.iconPractical]}>
            <Ionicons
              name={theory ? 'book' : 'car-sport'}
              size={24}
              color={theory ? theme.colors.accentText : theme.colors.warningText}
            />
          </View>

          <View style={styles.info}>
            <Text style={styles.type}>
              {t('myExams.examSuffix', { type: examTypeLabel(item.type) })}
            </Text>
            <Badge
              label={examStatusLabel(item.type, item.status)}
              tone={statusTone(item.status)}
              dot
            />
          </View>

          {item.result === ExamResult.PASSED || item.result === ExamResult.FAILED ? (
            <Badge
              label={examResultLabel(item.result)}
              tone={item.result === ExamResult.PASSED ? 'success' : 'danger'}
            />
          ) : null}
        </View>

        {item.status === ExamStatus.PENDING ? (
          <View style={styles.block}>
            <View style={styles.metaRow}>
              <Ionicons name="calendar-outline" size={16} color={theme.colors.textMuted} />
              <Text style={styles.metaLabel}>{t('myExams.preferredDate')}</Text>
              <Text style={styles.meta}>{formatDate(item.preferredDate)}</Text>
            </View>
            {item.message ? (
              <View style={styles.quote}>
                <Text style={styles.quoteLabel}>{t('myExams.yourMessage')}</Text>
                <Text style={styles.quoteText}>{item.message}</Text>
              </View>
            ) : null}
            <Text style={styles.hint}>{procedure.pendingHint}</Text>
          </View>
        ) : null}

        {item.status === ExamStatus.SCHEDULED ? (
          <View style={styles.block}>
            <View style={styles.metaRow}>
              <Ionicons name="calendar-outline" size={16} color={theme.colors.textMuted} />
              <Text style={styles.meta}>{formatDate(item.dateTime)}</Text>
            </View>
            <View style={styles.metaRow}>
              <Ionicons name="time-outline" size={16} color={theme.colors.textMuted} />
              <Text style={styles.meta}>{formatTime(item.dateTime)}</Text>
            </View>
            {item.location ? (
              <View style={styles.metaRow}>
                <Ionicons name="location-outline" size={16} color={theme.colors.textMuted} />
                <Text style={styles.meta}>{item.location}</Text>
              </View>
            ) : null}
          </View>
        ) : null}

        {item.status === ExamStatus.COMPLETED ? (
          <View style={styles.block}>
            <View style={styles.metaRow}>
              <Ionicons name="calendar-outline" size={16} color={theme.colors.textMuted} />
              <Text style={styles.meta}>{formatDate(item.dateTime)}</Text>
            </View>
            {item.score !== null ? (
              <View style={styles.score}>
                <Text style={styles.scoreLabel}>{t('myExams.score')}</Text>
                <Text style={styles.scoreValue}>{item.score}/100</Text>
              </View>
            ) : null}
            {item.notes ? (
              <View style={styles.quote}>
                <Text style={styles.quoteLabel}>{t('myExams.instructorNotes')}</Text>
                <Text style={styles.quoteText}>{item.notes}</Text>
              </View>
            ) : null}
          </View>
        ) : null}

        {/* Refus : les mots viennent de la procédure du type (D-42) */}
        {rejected ? (
          <View style={styles.reason}>
            <Ionicons name="information-circle" size={20} color={theme.colors.dangerText} />
            <View style={styles.reasonBody}>
              <Text style={styles.reasonLabel}>{procedure.rejectedStatus}</Text>
              {item.rejectionReason ? (
                <Text style={styles.reasonText}>{item.rejectionReason}</Text>
              ) : null}
              <Text style={styles.reasonHint}>{procedure.rejectedHint}</Text>
            </View>
          </View>
        ) : null}

        {/* État de paiement (D-32) : planifié ou passé */}
        {item.status === ExamStatus.SCHEDULED || item.status === ExamStatus.COMPLETED ? (
          <View style={styles.paymentRow}>
            <Ionicons name="cash-outline" size={16} color={theme.colors.textSecondary} />
            <Text style={styles.payment}>
              {item.amount !== null ? formatAmount(item.amount, currency) : t('myExams.examFee')}
            </Text>
            <Badge
              label={item.paid ? t('myLessons.paid') : t('myLessons.unpaid')}
              tone={item.paid ? 'success' : 'neutral'}
            />
          </View>
        ) : null}
      </Card>
    );
  };

  return (
    <View style={styles.flex}>
      <AppBar title={t('myExams.title')} large />

      <View style={styles.filters}>
        {FILTERS.map((tab) => (
          <Chip
            key={tab.key}
            label={t(tab.labelKey)}
            selected={filter === tab.key}
            onPress={() => setFilter(tab.key)}
          />
        ))}
      </View>

      {loading && exams.length === 0 ? (
        <View style={styles.skeletons}>
          <SkeletonCard lines={3} />
          <SkeletonCard lines={3} />
        </View>
      ) : (
        <FlatList
          data={filteredExams}
          renderItem={renderExamCard}
          keyExtractor={(item) => item.id}
          contentContainerStyle={filteredExams.length === 0 ? styles.emptyList : styles.listContent}
          ListEmptyComponent={
            <EmptyState
              icon="ribbon-outline"
              title={t('myExams.emptyTitle', { filter: t(activeFilter.labelKey) })}
              message={
                filter === 'pending'
                  ? t('myExams.emptyPending')
                  : filter === 'scheduled'
                    ? t('myExams.emptyScheduled')
                    : filter === 'completed'
                      ? t('myExams.emptyCompleted')
                      : t('myExams.emptyClosed')
              }
              action={
                filter === 'pending'
                  ? {
                      label: t('myExams.requestExam'),
                      onPress: () => navigation.navigate('RequestExam'),
                    }
                  : undefined
              }
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
    filters: {
      flexDirection: 'row',
      gap: theme.spacing.sm,
      paddingHorizontal: theme.spacing.base,
      paddingVertical: theme.spacing.md,
      flexWrap: 'wrap',
    },
    skeletons: { padding: theme.spacing.base, gap: theme.spacing.md },
    listContent: { padding: theme.spacing.base, paddingTop: 0, gap: theme.spacing.md },
    emptyList: { flexGrow: 1, justifyContent: 'center' },
    card: { gap: theme.spacing.md },
    head: { flexDirection: 'row', alignItems: 'flex-start', gap: theme.spacing.md },
    icon: {
      width: 48,
      height: 48,
      borderRadius: theme.radius.lg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    iconTheory: { backgroundColor: theme.colors.accentSoft },
    iconPractical: { backgroundColor: theme.colors.warningSoft },
    info: { flex: 1, gap: theme.spacing.xs, alignItems: 'flex-start' },
    type: {
      fontSize: theme.typography.size.base,
      fontWeight: theme.typography.weight.semibold,
      color: theme.colors.textPrimary,
    },
    block: { gap: theme.spacing.sm },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
    metaLabel: { fontSize: theme.typography.size.sm, color: theme.colors.textMuted },
    meta: { flex: 1, fontSize: theme.typography.size.sm, color: theme.colors.textSecondary },
    hint: { fontSize: theme.typography.size.xs, color: theme.colors.textMuted },
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
    score: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: theme.colors.successSoft,
      borderRadius: theme.radius.md,
      padding: theme.spacing.md,
    },
    scoreLabel: {
      fontSize: theme.typography.size.sm,
      color: theme.colors.successText,
      fontWeight: theme.typography.weight.medium,
    },
    scoreValue: {
      fontSize: theme.typography.size.lg,
      fontWeight: theme.typography.weight.bold,
      color: theme.colors.successText,
    },
    reason: {
      flexDirection: 'row',
      gap: theme.spacing.sm,
      backgroundColor: theme.colors.dangerSoft,
      borderRadius: theme.radius.md,
      padding: theme.spacing.md,
    },
    reasonBody: { flex: 1, gap: 2 },
    reasonLabel: {
      fontSize: theme.typography.size.sm,
      fontWeight: theme.typography.weight.semibold,
      color: theme.colors.dangerText,
    },
    reasonText: { fontSize: theme.typography.size.sm, color: theme.colors.dangerText },
    reasonHint: { fontSize: theme.typography.size.xs, color: theme.colors.dangerText },
    paymentRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
    payment: {
      flex: 1,
      fontSize: theme.typography.size.base,
      fontWeight: theme.typography.weight.medium,
      color: theme.colors.textPrimary,
    },
  });
