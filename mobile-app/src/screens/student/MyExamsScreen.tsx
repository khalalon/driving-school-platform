/**
 * My Exams Screen - Minimal & Elegant
 * Single Responsibility: Display student's exam requests, schedule and results (X1)
 *
 * Un examen est une demande (`pending`) que l'école planifie (`scheduled`, date et centre),
 * refuse (`rejected`) ou clôt avec un résultat (`completed`) ; l'élève voit l'état de paiement.
 * Les mots dépendent du type (D-42) : théorie planifiée par l'école, pratique convoquée par la
 * session ATTT (`EXAM_PROCEDURES`).
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { examService } from '../../services/api/ExamService';
import { getApiErrorMessage } from '../../services/api/ApiError';
import {
  EXAM_PROCEDURES,
  EXAM_RESULT_LABELS,
  EXAM_TYPE_LABELS,
  Exam,
  ExamResult,
  ExamStatus,
  ExamType,
  examStatusLabel,
} from '../../models/Exam';
import { useSchoolCurrency } from '../../hooks/useSchoolCurrency';
import { formatAmount, formatDate, formatTime } from '../../utils/format';
import { colors, typography, spacing, shadows } from '../../theme';

type FilterType = 'pending' | 'scheduled' | 'completed' | 'closed';

const FILTERS: { key: FilterType; label: string; statuses: ExamStatus[] }[] = [
  { key: 'pending', label: 'Pending', statuses: [ExamStatus.PENDING] },
  { key: 'scheduled', label: 'Scheduled', statuses: [ExamStatus.SCHEDULED] },
  { key: 'completed', label: 'Completed', statuses: [ExamStatus.COMPLETED] },
  { key: 'closed', label: 'Closed', statuses: [ExamStatus.CANCELLED, ExamStatus.REJECTED] },
];

export const MyExamsScreen = ({ navigation }: any) => {
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
      Alert.alert('Error', getApiErrorMessage(error, 'Failed to load exams'));
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

  const getStatusConfig = (status: ExamStatus) => {
    switch (status) {
      case ExamStatus.PENDING:
        return { icon: 'time-outline', color: colors.warning[500], bg: colors.warning[50] };
      case ExamStatus.SCHEDULED:
        return { icon: 'calendar-outline', color: colors.primary[600], bg: colors.primary[50] };
      case ExamStatus.COMPLETED:
        return { icon: 'checkmark-circle', color: colors.success[500], bg: colors.success[50] };
      case ExamStatus.CANCELLED:
      case ExamStatus.REJECTED:
        return { icon: 'close-circle', color: colors.error[500], bg: colors.error[50] };
    }
  };

  const getResultConfig = (result: ExamResult) => {
    switch (result) {
      case ExamResult.PASSED:
        return { icon: 'checkmark-circle', color: colors.success[500], bg: colors.success[50] };
      case ExamResult.FAILED:
        return { icon: 'close-circle', color: colors.error[500], bg: colors.error[50] };
      default:
        return null;
    }
  };

  const renderExamCard = ({ item }: { item: Exam }) => {
    const statusConfig = getStatusConfig(item.status);
    const resultConfig = getResultConfig(item.result);
    const rejected = item.status === ExamStatus.REJECTED;
    const procedure = EXAM_PROCEDURES[item.type];

    return (
      <View style={styles.examCard}>
        <View style={styles.cardHeader}>
          <View style={styles.iconContainer}>
            <Ionicons
              name={item.type === ExamType.THEORY ? 'book-outline' : 'car-sport-outline'}
              size={28}
              color={item.type === ExamType.THEORY ? colors.primary[600] : colors.warning[600]}
            />
          </View>

          <View style={styles.examInfo}>
            <Text style={styles.examType}>{EXAM_TYPE_LABELS[item.type] ?? item.type} Exam</Text>

            {/* Status Badge */}
            <View style={[styles.statusBadge, { backgroundColor: statusConfig.bg }]}>
              <Ionicons name={statusConfig.icon as any} size={14} color={statusConfig.color} />
              <Text style={[styles.statusText, { color: statusConfig.color }]}>
                {examStatusLabel(item.type, item.status)}
              </Text>
            </View>
          </View>

          {resultConfig && (
            <View style={[styles.resultBadge, { backgroundColor: resultConfig.bg }]}>
              <Ionicons name={resultConfig.icon as any} size={20} color={resultConfig.color} />
              <Text style={[styles.resultText, { color: resultConfig.color }]}>
                {EXAM_RESULT_LABELS[item.result]}
              </Text>
            </View>
          )}
        </View>

        {/* Pending State - Show Request Info */}
        {item.status === ExamStatus.PENDING && (
          <View style={styles.requestInfo}>
            <View style={styles.infoRow}>
              <Ionicons name="calendar-outline" size={16} color={colors.text.tertiary} />
              <Text style={styles.infoLabel}>Preferred Date:</Text>
              <Text style={styles.infoText}>{formatDate(item.preferredDate)}</Text>
            </View>
            {item.message && (
              <View style={styles.messageBox}>
                <Text style={styles.messageLabel}>Your Message:</Text>
                <Text style={styles.messageText}>{item.message}</Text>
              </View>
            )}
            <Text style={styles.helperText}>{procedure.pendingHint}</Text>
          </View>
        )}

        {/* Scheduled State - Show Schedule Info */}
        {item.status === ExamStatus.SCHEDULED && (
          <View style={styles.scheduleInfo}>
            <View style={styles.dateRow}>
              <Ionicons name="calendar-outline" size={16} color={colors.text.tertiary} />
              <Text style={styles.dateText}>{formatDate(item.dateTime)}</Text>
            </View>
            <View style={styles.timeRow}>
              <Ionicons name="time-outline" size={16} color={colors.text.tertiary} />
              <Text style={styles.timeText}>{formatTime(item.dateTime)}</Text>
            </View>
            {item.location && (
              <View style={styles.locationRow}>
                <Ionicons name="location-outline" size={16} color={colors.text.secondary} />
                <Text style={styles.locationText}>{item.location}</Text>
              </View>
            )}
          </View>
        )}

        {/* Completed State - Show Results */}
        {item.status === ExamStatus.COMPLETED && (
          <View style={styles.resultInfo}>
            <View style={styles.dateRow}>
              <Ionicons name="calendar-outline" size={16} color={colors.text.tertiary} />
              <Text style={styles.dateText}>{formatDate(item.dateTime)}</Text>
            </View>

            {item.score !== null && (
              <View style={styles.scoreBox}>
                <View style={styles.scoreHeader}>
                  <Text style={styles.scoreLabel}>Score</Text>
                  <Text style={styles.scoreValue}>{item.score}/100</Text>
                </View>
              </View>
            )}

            {item.notes && (
              <View style={styles.notesBox}>
                <Text style={styles.notesLabel}>Instructor Notes:</Text>
                <Text style={styles.notesText}>{item.notes}</Text>
              </View>
            )}
          </View>
        )}

        {/* Rejected State - Show Reason (D-42 : « File not ready » pour la pratique) */}
        {rejected && (
          <View style={styles.rejectionBox}>
            <Ionicons name="information-circle-outline" size={20} color={colors.error[600]} />
            <View style={styles.rejectionContent}>
              <Text style={styles.rejectionLabel}>{procedure.rejectedStatus}:</Text>
              {item.rejectionReason && (
                <Text style={styles.rejectionText}>{item.rejectionReason}</Text>
              )}
              <Text style={styles.rejectionHint}>{procedure.rejectedHint}</Text>
            </View>
          </View>
        )}

        {/* État de paiement (D-32) : planifié ou passé */}
        {(item.status === ExamStatus.SCHEDULED || item.status === ExamStatus.COMPLETED) && (
          <View style={styles.paymentRow}>
            <Ionicons name="cash-outline" size={16} color={colors.text.secondary} />
            <Text style={styles.paymentText}>
              {item.amount !== null ? formatAmount(item.amount, currency) : 'Exam fee'}
            </Text>
            <View style={[styles.paidBadge, item.paid ? styles.paidBadgeOn : styles.paidBadgeOff]}>
              <Text style={[styles.paidText, item.paid ? styles.paidTextOn : styles.paidTextOff]}>
                {item.paid ? 'Paid' : 'Unpaid'}
              </Text>
            </View>
          </View>
        )}
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconContainer}>
        <Ionicons name="trophy-outline" size={64} color={colors.neutral[300]} />
      </View>
      <Text style={styles.emptyTitle}>No {activeFilter.label.toLowerCase()} exams</Text>
      <Text style={styles.emptyText}>
        {filter === 'pending'
          ? 'Request your first exam to get started'
          : filter === 'scheduled'
            ? 'No upcoming exams scheduled yet'
            : filter === 'completed'
              ? 'Your completed exams will appear here'
              : 'Rejected or cancelled exams will appear here'}
      </Text>
      {filter === 'pending' && (
        <TouchableOpacity
          style={styles.requestButton}
          onPress={() => navigation.navigate('RequestExam')}
          activeOpacity={0.8}
        >
          <Ionicons name="add-circle-outline" size={20} color={colors.text.inverse} />
          <Text style={styles.requestButtonText}>Request Exam</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary[600]} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Exams</Text>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        {FILTERS.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.filterTab, filter === tab.key && styles.filterTabActive]}
            onPress={() => setFilter(tab.key)}
            activeOpacity={0.7}
          >
            <Text
              style={[styles.filterTabText, filter === tab.key && styles.filterTabTextActive]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Exams List */}
      <FlatList
        data={filteredExams}
        renderItem={renderExamCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={filteredExams.length === 0 ? styles.emptyList : styles.listContent}
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary[600]}
          />
        }
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.secondary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background.secondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing['4xl'],
    paddingBottom: spacing.lg,
    backgroundColor: colors.background.primary,
    gap: spacing.md,
  },
  headerTitle: {
    fontSize: typography.size.xl,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    backgroundColor: colors.background.primary,
    gap: spacing.sm,
  },
  filterTab: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: colors.background.tertiary,
  },
  filterTabActive: {
    backgroundColor: colors.primary[600],
  },
  filterTabText: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.medium,
    color: colors.text.secondary,
  },
  filterTabTextActive: {
    color: colors.text.inverse,
  },
  listContent: {
    padding: spacing.xl,
    gap: spacing.md,
  },
  emptyList: {
    flexGrow: 1,
  },
  examCard: {
    backgroundColor: colors.background.primary,
    borderRadius: 16,
    padding: spacing.lg,
    gap: spacing.md,
    ...shadows.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'flex-start',
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  examInfo: {
    flex: 1,
    gap: spacing.xs,
  },
  examType: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 6,
    gap: spacing.xs,
  },
  statusText: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.semibold,
  },
  resultBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    gap: spacing.xs,
  },
  resultText: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
  },
  requestInfo: {
    gap: spacing.sm,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  infoLabel: {
    fontSize: typography.size.sm,
    color: colors.text.tertiary,
  },
  infoText: {
    fontSize: typography.size.sm,
    color: colors.text.secondary,
    fontWeight: typography.weight.medium,
  },
  messageBox: {
    backgroundColor: colors.neutral[50],
    padding: spacing.md,
    borderRadius: 8,
    gap: spacing.xs,
  },
  messageLabel: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.semibold,
    color: colors.text.secondary,
    textTransform: 'uppercase',
  },
  messageText: {
    fontSize: typography.size.sm,
    color: colors.text.primary,
    lineHeight: typography.size.sm * typography.lineHeight.normal,
  },
  helperText: {
    fontSize: typography.size.xs,
    color: colors.text.tertiary,
    fontStyle: 'italic',
  },
  scheduleInfo: {
    gap: spacing.sm,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  dateText: {
    fontSize: typography.size.sm,
    color: colors.text.secondary,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  timeText: {
    fontSize: typography.size.sm,
    color: colors.text.secondary,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  locationText: {
    fontSize: typography.size.sm,
    color: colors.text.secondary,
  },
  resultInfo: {
    gap: spacing.md,
  },
  scoreBox: {
    backgroundColor: colors.neutral[50],
    padding: spacing.md,
    borderRadius: 8,
  },
  scoreHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  scoreLabel: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
    color: colors.text.secondary,
  },
  scoreValue: {
    fontSize: typography.size['2xl'],
    fontWeight: typography.weight.bold,
    color: colors.primary[600],
  },
  notesBox: {
    gap: spacing.xs,
  },
  notesLabel: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.semibold,
    color: colors.text.secondary,
    textTransform: 'uppercase',
  },
  notesText: {
    fontSize: typography.size.sm,
    color: colors.text.primary,
    lineHeight: typography.size.sm * typography.lineHeight.normal,
  },
  rejectionBox: {
    flexDirection: 'row',
    backgroundColor: colors.error[50],
    padding: spacing.md,
    borderRadius: 8,
    gap: spacing.md,
  },
  rejectionContent: {
    flex: 1,
    gap: spacing.xs,
  },
  rejectionLabel: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.semibold,
    color: colors.error[600],
    textTransform: 'uppercase',
  },
  rejectionText: {
    fontSize: typography.size.sm,
    color: colors.error[600],
    lineHeight: typography.size.sm * typography.lineHeight.normal,
  },
  rejectionHint: {
    fontSize: typography.size.xs,
    color: colors.text.tertiary,
    fontStyle: 'italic',
    marginTop: spacing.xs,
  },
  paymentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  paymentText: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
    color: colors.text.secondary,
  },
  paidBadge: {
    marginLeft: 'auto',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 6,
  },
  paidBadgeOn: {
    backgroundColor: colors.success[50],
  },
  paidBadgeOff: {
    backgroundColor: colors.warning[50],
  },
  paidText: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.semibold,
  },
  paidTextOn: {
    color: colors.success[600],
  },
  paidTextOff: {
    color: colors.warning[600],
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing['4xl'],
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.neutral[100],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  emptyTitle: {
    fontSize: typography.size.xl,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  emptyText: {
    fontSize: typography.size.base,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  requestButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary[600],
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: 12,
    gap: spacing.sm,
    ...shadows.sm,
  },
  requestButtonText: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.semibold,
    color: colors.text.inverse,
  },
});