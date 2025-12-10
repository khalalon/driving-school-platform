/**
 * Today Lessons Screen - Minimal & Elegant
 * Single Responsibility: Display and manage today's lessons
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
import { Lesson, LessonStatus } from '../../models/Lesson';
import { colors, typography, spacing, shadows } from '../../theme';

type FilterType = 'upcoming' | 'completed';

export const TodayLessonsScreen = ({ navigation }: any) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [filter, setFilter] = useState<FilterType>('upcoming');

  useEffect(() => {
    loadTodayLessons();
  }, []);

  const loadTodayLessons = async () => {
    try {
      setLoading(true);
      const allLessons = await lessonService.getMyLessons();
      
      // Filter for today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const todayLessons = allLessons.filter((lesson) => {
        const lessonDate = new Date(lesson.startTime);
        return lessonDate >= today && lessonDate < tomorrow;
      });

      setLessons(todayLessons);
    } catch (error: any) {
      Alert.alert('Error', 'Failed to load lessons');
      console.error('Load lessons error:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadTodayLessons();
    setRefreshing(false);
  }, []);

  const handleMarkComplete = (lesson: Lesson) => {
    Alert.alert(
      'Mark Complete',
      `Mark lesson with ${lesson.instructor?.firstName} as completed?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Complete',
          onPress: () => confirmMarkComplete(lesson.id),
        },
      ]
    );
  };

  const confirmMarkComplete = async (lessonId: string) => {
    try {
      // Call API to mark as complete
      Alert.alert('Success', 'Lesson marked as completed');
      loadTodayLessons();
    } catch (error: any) {
      Alert.alert('Error', 'Failed to mark lesson as complete');
    }
  };

  const getFilteredLessons = () => {
    return lessons.filter((lesson) => {
      switch (filter) {
        case 'upcoming':
          return lesson.status === LessonStatus.SCHEDULED;
        case 'completed':
          return lesson.status === LessonStatus.COMPLETED;
        default:
          return true;
      }
    });
  };

  const renderLessonCard = ({ item }: { item: Lesson }) => {
    const lessonTime = new Date(item.startTime);
    const isCompleted = item.status === LessonStatus.COMPLETED;

    return (
      <View style={styles.lessonCard}>
        <View style={styles.cardHeader}>
          <View style={styles.timeBox}>
            <Ionicons name="time-outline" size={24} color={colors.primary[600]} />
            <Text style={styles.timeText}>
              {lessonTime.toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
          </View>

          <View style={styles.lessonInfo}>
            <Text style={styles.studentName}>Student Name</Text>
            <View style={styles.detailRow}>
              <Ionicons name="car-outline" size={16} color={colors.text.tertiary} />
              <Text style={styles.detailText}>{item.type}</Text>
            </View>
            <View style={styles.detailRow}>
              <Ionicons name="time-outline" size={16} color={colors.text.tertiary} />
              <Text style={styles.detailText}>{item.duration} min</Text>
            </View>
          </View>

          {isCompleted && (
            <View style={styles.completedBadge}>
              <Ionicons name="checkmark-circle" size={24} color={colors.success[500]} />
            </View>
          )}
        </View>

        {!isCompleted && (
          <TouchableOpacity
            style={styles.completeButton}
            onPress={() => handleMarkComplete(item)}
            activeOpacity={0.7}
          >
            <Ionicons name="checkmark-outline" size={20} color={colors.success[600]} />
            <Text style={styles.completeButtonText}>Mark Complete</Text>
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
          : "You haven't completed any lessons yet today"}
      </Text>
    </View>
  );

  const filteredLessons = getFilteredLessons();

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
  },
  completedBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.success[50],
    alignItems: 'center',
    justifyContent: 'center',
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
});
