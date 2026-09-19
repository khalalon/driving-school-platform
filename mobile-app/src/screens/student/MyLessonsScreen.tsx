/**
 * My Lessons Screen - Minimal & Elegant
 * Single Responsibility: Display student's lessons (L1) and let them cancel (L3)
 *
 * Une leçon naît d'une demande (`pending`, date souhaitée), est planifiée par l'instructeur
 * (`scheduled`, date confirmée), puis passe `completed` ; l'élève voit l'état de paiement (D-32).
 */

import React, { useState, useEffect, useCallback } from 'react';
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
import { lessonService } from '../../services/api/LessonService';
import { getApiErrorMessage } from '../../services/api/ApiError';
import {
  LESSON_STATUS_LABELS,
  LESSON_TYPE_LABELS,
  Lesson,
  LessonStatus,
} from '../../models/Lesson';
import { formatAmount, formatPersonName, formatTime } from '../../utils/format';
import { colors, typography, spacing, shadows } from '../../theme';

type FilterType = 'pending' | 'upcoming' | 'completed' | 'closed';

const FILTERS: { key: FilterType; label: string; statuses: LessonStatus[] }[] = [
  { key: 'pending', label: 'Pending', statuses: [LessonStatus.PENDING] },
  { key: 'upcoming', label: 'Upcoming', statuses: [LessonStatus.SCHEDULED] },
  { key: 'completed', label: 'Completed', statuses: [LessonStatus.COMPLETED] },
  { key: 'closed', label: 'Closed', statuses: [LessonStatus.CANCELLED, LessonStatus.REJECTED] },
];

/** Date affichée : celle confirmée par l'instructeur, sinon celle souhaitée par l'élève. */
const lessonDateOf = (lesson: Lesson): Date | null => {
  const iso = lesson.scheduledDate ?? lesson.requestedDate;
  return iso ? new Date(iso) : null;
};

export const MyLessonsScreen = ({ navigation }: any) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [filter, setFilter] = useState<FilterType>('upcoming');

  useEffect(() => {
    loadLessons();
  }, []);

  const loadLessons = async () => {
    try {
      setLoading(true);
      const data = await lessonService.getMyLessons();
      setLessons(data);
    } catch (error) {
      Alert.alert('Error', getApiErrorMessage(error, 'Failed to load lessons'));
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadLessons();
    setRefreshing(false);
  }, []);

  const handleCancelLesson = (lesson: Lesson) => {
    const isRequest = lesson.status === LessonStatus.PENDING;
    Alert.alert(
      isRequest ? 'Cancel Request' : 'Cancel Lesson',
      isRequest
        ? 'Are you sure you want to withdraw this lesson request?'
        : 'Are you sure you want to cancel this lesson?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: () => confirmCancelLesson(lesson.id),
        },
      ]
    );
  };

  const confirmCancelLesson = async (lessonId: string) => {
    try {
      await lessonService.cancelLesson(lessonId);
      Alert.alert('Success', 'Lesson cancelled successfully');
      loadLessons();
    } catch (error) {
      // Fenêtre de 24 h (D-24) contrôlée par le serveur : le message français explique le refus
      Alert.alert('Error', getApiErrorMessage(error, 'Failed to cancel lesson'));
    }
  };

  const activeFilter = FILTERS.find((f) => f.key === filter) ?? FILTERS[0];
  const filteredLessons = lessons.filter((lesson) => activeFilter.statuses.includes(lesson.status));

  const getStatusConfig = (status: LessonStatus) => {
    switch (status) {
      case LessonStatus.PENDING:
        return { color: colors.warning[500], bg: colors.warning[50] };
      case LessonStatus.SCHEDULED:
        return { color: colors.primary[600], bg: colors.primary[50] };
      case LessonStatus.COMPLETED:
        return { color: colors.success[500], bg: colors.success[50] };
      case LessonStatus.CANCELLED:
      case LessonStatus.REJECTED:
        return { color: colors.error[500], bg: colors.error[50] };
    }
  };

  const renderLessonCard = ({ item }: { item: Lesson }) => {
    const statusConfig = getStatusConfig(item.status);
    const lessonDate = lessonDateOf(item);
    const isPending = item.status === LessonStatus.PENDING;
    const canCancel = isPending || item.status === LessonStatus.SCHEDULED;

    return (
      <View style={styles.lessonCard}>
        <View style={styles.cardHeader}>
          <View style={styles.dateBox}>
            <Text style={styles.dateMonth}>
              {lessonDate
                ? lessonDate.toLocaleDateString('en-US', { month: 'short' }).toUpperCase()
                : '—'}
            </Text>
            <Text style={styles.dateDay}>{lessonDate ? lessonDate.getDate() : '?'}</Text>
          </View>

          <View style={styles.lessonInfo}>
            <Text style={styles.lessonType}>{LESSON_TYPE_LABELS[item.type] ?? item.type}</Text>
            <View style={styles.instructorRow}>
              <Ionicons name="person-outline" size={16} color={colors.text.tertiary} />
              <Text style={styles.instructorText}>
                {item.instructor
                  ? formatPersonName(item.instructor, 'Instructor')
                  : isPending
                    ? 'Awaiting an instructor'
                    : 'No instructor'}
              </Text>
            </View>
            <View style={styles.timeRow}>
              <Ionicons name="time-outline" size={16} color={colors.text.tertiary} />
              <Text style={styles.timeText}>
                {isPending ? 'Requested: ' : ''}
                {formatTime(item.scheduledDate ?? item.requestedDate)}
                {item.durationMinutes ? ` · ${item.durationMinutes} min` : ''}
              </Text>
            </View>
          </View>

          <View style={[styles.statusBadge, { backgroundColor: statusConfig.bg }]}>
            <Text style={[styles.statusText, { color: statusConfig.color }]}>
              {LESSON_STATUS_LABELS[item.status]}
            </Text>
          </View>
        </View>

        {/* Prix et état de paiement (D-32) */}
        {(item.price !== null || item.paid) && (
          <View style={styles.priceRow}>
            <Ionicons name="cash-outline" size={16} color={colors.text.secondary} />
            <Text style={styles.priceText}>{formatAmount(item.amount ?? item.price)}</Text>
            <View style={[styles.paidBadge, item.paid ? styles.paidBadgeOn : styles.paidBadgeOff]}>
              <Text style={[styles.paidText, item.paid ? styles.paidTextOn : styles.paidTextOff]}>
                {item.paid ? 'Paid' : 'Unpaid'}
              </Text>
            </View>
          </View>
        )}

        {item.status === LessonStatus.REJECTED && item.rejectionReason && (
          <View style={styles.reasonBox}>
            <Ionicons name="information-circle-outline" size={18} color={colors.error[600]} />
            <Text style={styles.reasonText}>{item.rejectionReason}</Text>
          </View>
        )}

        {item.status === LessonStatus.CANCELLED && item.cancellationReason && (
          <View style={styles.reasonBox}>
            <Ionicons name="information-circle-outline" size={18} color={colors.error[600]} />
            <Text style={styles.reasonText}>{item.cancellationReason}</Text>
          </View>
        )}

        {canCancel && (
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => handleCancelLesson(item)}
            activeOpacity={0.7}
          >
            <Ionicons name="close-circle-outline" size={20} color={colors.error[600]} />
            <Text style={styles.cancelButtonText}>
              {isPending ? 'Withdraw Request' : 'Cancel Lesson'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconContainer}>
        <Ionicons name="calendar-outline" size={64} color={colors.neutral[300]} />
      </View>
      <Text style={styles.emptyTitle}>No {activeFilter.label.toLowerCase()} lessons</Text>
      <Text style={styles.emptyText}>
        {filter === 'upcoming' || filter === 'pending'
          ? 'Request a lesson from your school to get started'
          : `You don't have any ${activeFilter.label.toLowerCase()} lessons yet`}
      </Text>
      {(filter === 'upcoming' || filter === 'pending') && (
        <TouchableOpacity
          style={styles.bookButton}
          onPress={() => navigation.navigate('SchoolsList')}
          activeOpacity={0.8}
        >
          <Ionicons name="add-circle-outline" size={20} color={colors.text.inverse} />
          <Text style={styles.bookButtonText}>Request Lesson</Text>
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
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Lessons</Text>
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

      {/* Lessons List */}
      <FlatList
        data={filteredLessons}
        renderItem={renderLessonCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={filteredLessons.length === 0 ? styles.emptyList : styles.listContent}
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
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.background.tertiary,
    alignItems: 'center',
    justifyContent: 'center',
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
  lessonCard: {
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
  dateBox: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateMonth: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.semibold,
    color: colors.primary[600],
  },
  dateDay: {
    fontSize: typography.size.xl,
    fontWeight: typography.weight.bold,
    color: colors.primary[600],
  },
  lessonInfo: {
    flex: 1,
    gap: spacing.xs,
  },
  lessonType: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
  },
  instructorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  instructorText: {
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
  statusBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  statusText: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.semibold,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  priceText: {
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
  reasonBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: colors.error[50],
    padding: spacing.md,
    borderRadius: 8,
  },
  reasonText: {
    flex: 1,
    fontSize: typography.size.sm,
    color: colors.text.secondary,
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: 8,
    backgroundColor: colors.error[50],
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  cancelButtonText: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
    color: colors.error[600],
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
  bookButton: {
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
  bookButtonText: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.semibold,
    color: colors.text.inverse,
  },
});
