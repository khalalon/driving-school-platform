/**
 * Today Lessons Screen - Minimal & Elegant
 * Single Responsibility: The instructor's own lessons of the day (L1 scope=mine, date) and
 * attendance (L7)
 *
 * Un instructeur ne voit et ne pointe que ses leçons (D-32). La présence passe la leçon en
 * `completed` ; le compteur de leçons effectuées de l'élève n'augmente que s'il était présent
 * (D-33). Une leçon = un élève (D-34) : la présence se fait par identifiant de leçon.
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
  Modal,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { lessonService } from '../../services/api/LessonService';
import { getApiErrorMessage } from '../../services/api/ApiError';
import { LESSON_TYPE_LABELS, Lesson, LessonStatus } from '../../models/Lesson';
import { formatPersonName, formatTime, toLocalDateKey } from '../../utils/format';
import { colors, typography, spacing, shadows } from '../../theme';

type FilterType = 'upcoming' | 'completed';

const RATINGS = [1, 2, 3, 4, 5];

export const TodayLessonsScreen = ({ navigation }: any) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [filter, setFilter] = useState<FilterType>('upcoming');
  const [processing, setProcessing] = useState(false);

  // Attendance modal (L7)
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [attended, setAttended] = useState(true);
  const [feedback, setFeedback] = useState('');
  const [rating, setRating] = useState<number | null>(null);

  useEffect(() => {
    loadTodayLessons();
  }, []);

  const loadTodayLessons = async () => {
    try {
      setLoading(true);
      // L1 : mes leçons du jour (planifiées, et déjà pointées pour l'onglet Completed)
      const data = await lessonService.getMyLessons({
        status: [LessonStatus.SCHEDULED, LessonStatus.COMPLETED],
        scope: 'mine',
        date: toLocalDateKey(),
      });
      setLessons(data);
    } catch (error) {
      Alert.alert('Error', getApiErrorMessage(error, 'Failed to load lessons'));
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadTodayLessons();
    setRefreshing(false);
  }, []);

  const openAttendance = (lesson: Lesson) => {
    setSelectedLesson(lesson);
    setAttended(true);
    setFeedback('');
    setRating(null);
    setShowAttendanceModal(true);
  };

  const closeAttendance = () => {
    setShowAttendanceModal(false);
    setSelectedLesson(null);
  };

  const confirmAttendance = async () => {
    if (!selectedLesson) return;
    try {
      setProcessing(true);
      // L7 : par identifiant de leçon, uniquement par son instructeur
      await lessonService.markAttendance(selectedLesson.id, {
        attended,
        feedback: feedback.trim() || undefined,
        rating: attended && rating !== null ? rating : undefined,
      });
      Alert.alert(
        'Success',
        attended ? 'Lesson completed, attendance recorded' : 'Absence recorded'
      );
      closeAttendance();
      loadTodayLessons();
    } catch (error) {
      Alert.alert('Error', getApiErrorMessage(error, 'Failed to record attendance'));
    } finally {
      setProcessing(false);
    }
  };

  const filteredLessons = lessons.filter((lesson) =>
    filter === 'upcoming'
      ? lesson.status === LessonStatus.SCHEDULED
      : lesson.status === LessonStatus.COMPLETED
  );

  const renderLessonCard = ({ item }: { item: Lesson }) => {
    const isCompleted = item.status === LessonStatus.COMPLETED;

    return (
      <View style={styles.lessonCard}>
        <View style={styles.cardHeader}>
          <View style={styles.timeBox}>
            <Ionicons name="time-outline" size={24} color={colors.primary[600]} />
            <Text style={styles.timeText}>{formatTime(item.scheduledDate)}</Text>
          </View>

          <View style={styles.lessonInfo}>
            <Text style={styles.studentName}>{formatPersonName(item.student, 'Student')}</Text>
            <View style={styles.detailRow}>
              <Ionicons name="car-outline" size={16} color={colors.text.tertiary} />
              <Text style={styles.detailText}>{LESSON_TYPE_LABELS[item.type] ?? item.type}</Text>
            </View>
            <View style={styles.detailRow}>
              <Ionicons name="time-outline" size={16} color={colors.text.tertiary} />
              <Text style={styles.detailText}>{item.durationMinutes ?? '—'} min</Text>
            </View>
            {item.adminNotes && (
              <View style={styles.detailRow}>
                <Ionicons name="document-text-outline" size={16} color={colors.text.tertiary} />
                <Text style={styles.detailText}>{item.adminNotes}</Text>
              </View>
            )}
          </View>

          {isCompleted && (
            <View
              style={[styles.completedBadge, item.attended === false && styles.absentBadge]}
            >
              <Ionicons
                name={item.attended === false ? 'close-circle' : 'checkmark-circle'}
                size={24}
                color={item.attended === false ? colors.error[500] : colors.success[500]}
              />
            </View>
          )}
        </View>

        {isCompleted && (
          <Text style={styles.attendanceText}>
            {item.attended === false ? 'Student absent' : 'Student present'}
            {item.rating ? ` · ${item.rating}/5` : ''}
            {item.feedback ? ` · ${item.feedback}` : ''}
          </Text>
        )}

        {!isCompleted && (
          <TouchableOpacity
            style={styles.completeButton}
            onPress={() => openAttendance(item)}
            activeOpacity={0.7}
            disabled={processing}
          >
            <Ionicons name="checkmark-outline" size={20} color={colors.success[600]} />
            <Text style={styles.completeButtonText}>Record Attendance</Text>
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
      <Text style={styles.emptyTitle}>No {filter} lessons today</Text>
      <Text style={styles.emptyText}>
        {filter === 'upcoming'
          ? "You don't have any scheduled lessons today"
          : "You haven't recorded any attendance yet today"}
      </Text>
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
        <Text style={styles.headerTitle}>Today's Lessons</Text>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        {(['upcoming', 'completed'] as FilterType[]).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.filterTab, filter === tab && styles.filterTabActive]}
            onPress={() => setFilter(tab)}
            activeOpacity={0.7}
          >
            <Text style={[styles.filterTabText, filter === tab && styles.filterTabTextActive]}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Lessons List */}
      <FlatList
        data={filteredLessons}
        renderItem={renderLessonCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={
          filteredLessons.length === 0 ? styles.emptyList : styles.listContent
        }
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

      {/* Attendance Modal (L7) */}
      <Modal
        visible={showAttendanceModal}
        transparent
        animationType="fade"
        onRequestClose={closeAttendance}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Record Attendance</Text>
              <TouchableOpacity onPress={closeAttendance}>
                <Ionicons name="close" size={24} color={colors.text.secondary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>
              {selectedLesson
                ? `${LESSON_TYPE_LABELS[selectedLesson.type]} lesson with ${formatPersonName(
                    selectedLesson.student,
                    'the student'
                  )} at ${formatTime(selectedLesson.scheduledDate)}`
                : ''}
            </Text>

            <View style={styles.section}>
              <Text style={styles.label}>Was the student present?</Text>
              <View style={styles.choiceRow}>
                <TouchableOpacity
                  style={[styles.choiceButton, attended && styles.choicePresent]}
                  onPress={() => setAttended(true)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name="checkmark-circle"
                    size={24}
                    color={attended ? colors.success[600] : colors.text.tertiary}
                  />
                  <Text style={[styles.choiceText, attended && styles.choiceTextActive]}>
                    Present
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.choiceButton, !attended && styles.choiceAbsent]}
                  onPress={() => setAttended(false)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name="close-circle"
                    size={24}
                    color={!attended ? colors.error[600] : colors.text.tertiary}
                  />
                  <Text style={[styles.choiceText, !attended && styles.choiceTextActive]}>
                    Absent
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {attended && (
              <View style={styles.section}>
                <Text style={styles.label}>Rating (optional)</Text>
                <View style={styles.ratingRow}>
                  {RATINGS.map((star) => (
                    <TouchableOpacity
                      key={star}
                      onPress={() => setRating(rating === star ? null : star)}
                      activeOpacity={0.7}
                      style={styles.starButton}
                    >
                      <Ionicons
                        name={rating !== null && star <= rating ? 'star' : 'star-outline'}
                        size={28}
                        color={colors.warning[500]}
                      />
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            <View style={styles.section}>
              <Text style={styles.label}>Feedback (optional)</Text>
              <TextInput
                style={styles.feedbackInput}
                placeholder="Progress, points to work on..."
                placeholderTextColor={colors.neutral[400]}
                value={feedback}
                onChangeText={setFeedback}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalCancelButton]}
                onPress={closeAttendance}
                activeOpacity={0.7}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  styles.modalConfirmButton,
                  processing && styles.disabledButton,
                ]}
                onPress={confirmAttendance}
                disabled={processing}
                activeOpacity={0.7}
              >
                {processing ? (
                  <ActivityIndicator size="small" color={colors.text.inverse} />
                ) : (
                  <Text style={styles.modalConfirmText}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: colors.background.tertiary,
  },
  filterTabActive: {
    backgroundColor: colors.primary[600],
  },
  filterTabText: {
    fontSize: typography.size.sm,
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
  timeBox: {
    width: 72,
    height: 72,
    borderRadius: 12,
    backgroundColor: colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  timeText: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.semibold,
    color: colors.primary[600],
  },
  lessonInfo: {
    flex: 1,
    gap: spacing.xs,
  },
  studentName: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  detailText: {
    fontSize: typography.size.sm,
    color: colors.text.secondary,
    flexShrink: 1,
  },
  completedBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.success[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  absentBadge: {
    backgroundColor: colors.error[50],
  },
  attendanceText: {
    fontSize: typography.size.sm,
    color: colors.text.secondary,
  },
  completeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: 8,
    backgroundColor: colors.success[50],
    gap: spacing.xs,
  },
  completeButtonText: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
    color: colors.success[600],
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
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  modalContent: {
    backgroundColor: colors.background.primary,
    borderRadius: 16,
    padding: spacing.xl,
    ...shadows.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  modalTitle: {
    fontSize: typography.size.xl,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
  },
  modalSubtitle: {
    fontSize: typography.size.sm,
    color: colors.text.secondary,
    marginBottom: spacing.lg,
  },
  section: {
    marginBottom: spacing.lg,
  },
  label: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.medium,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  choiceRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  choiceButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border.default,
    backgroundColor: colors.background.secondary,
  },
  choicePresent: {
    borderColor: colors.success[500],
    backgroundColor: colors.success[50],
  },
  choiceAbsent: {
    borderColor: colors.error[500],
    backgroundColor: colors.error[50],
  },
  choiceText: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.medium,
    color: colors.text.secondary,
  },
  choiceTextActive: {
    color: colors.text.primary,
  },
  ratingRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  starButton: {
    padding: spacing.xs,
  },
  feedbackInput: {
    backgroundColor: colors.background.secondary,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border.default,
    padding: spacing.base,
    fontSize: typography.size.base,
    color: colors.text.primary,
    minHeight: 80,
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  modalButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelButton: {
    backgroundColor: colors.background.tertiary,
  },
  modalCancelText: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.semibold,
    color: colors.text.secondary,
  },
  modalConfirmButton: {
    backgroundColor: colors.success[600],
  },
  modalConfirmText: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.semibold,
    color: colors.text.inverse,
  },
  disabledButton: {
    opacity: 0.5,
  },
});
