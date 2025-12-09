/**
 * Today Lessons Screen (Instructor)
 * Single Responsibility: Display today's scheduled lessons for instructor
 * Open/Closed: Can extend with filtering, notes without modifying core
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { lessonService } from '../../services/api/LessonService';
import { Lesson, LessonStatus, LessonType } from '../../models/Lesson';

export const TodayLessonsScreen = ({ navigation }: any) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [filter, setFilter] = useState<'upcoming' | 'completed'>('upcoming');

  useEffect(() => {
    loadTodayLessons();
  }, []);

  const loadTodayLessons = async () => {
    try {
      setLoading(true);
      // Get all lessons and filter for today
      const allLessons = await lessonService.getMyLessons();
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const todayLessons = allLessons.filter((lesson) => {
        const lessonDate = new Date(lesson.startTime);
        lessonDate.setHours(0, 0, 0, 0);
        return lessonDate.getTime() === today.getTime();
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
      'Complete Lesson',
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
      // This would call an instructor-specific endpoint
      // For now, we'll just show success
      Alert.alert('Success', 'Lesson marked as completed');
      loadTodayLessons();
    } catch (error: any) {
      Alert.alert('Error', 'Failed to mark lesson as completed');
      console.error('Mark complete error:', error);
    }
  };

  const handleViewStudent = (lesson: Lesson) => {
    Alert.alert('Student Details', `Student ID: ${lesson.studentId}`);
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const getFilteredLessons = () => {
    return lessons.filter((lesson) => {
      if (filter === 'upcoming') {
        return lesson.status === LessonStatus.SCHEDULED;
      } else {
        return lesson.status === LessonStatus.COMPLETED;
      }
    });
  };

  const getStatusColor = (status: LessonStatus) => {
    switch (status) {
      case LessonStatus.SCHEDULED:
        return '#4CAF50';
      case LessonStatus.COMPLETED:
        return '#2196F3';
      case LessonStatus.CANCELLED:
        return '#f44336';
      default:
        return '#999';
    }
  };

  const getLessonTypeIcon = (type: LessonType) => {
    return type === LessonType.PRACTICAL ? 'car-sport-outline' : 'book-outline';
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1a1a1a" />
      </View>
    );
  }

  const filteredLessons = getFilteredLessons();
  const upcomingCount = lessons.filter(l => l.status === LessonStatus.SCHEDULED).length;
  const completedCount = lessons.filter(l => l.status === LessonStatus.COMPLETED).length;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#1a1a1a" />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>Today's Lessons</Text>
          <Text style={styles.headerDate}>
            {new Date().toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'short',
              day: 'numeric',
            })}
          </Text>
        </View>
        <View style={styles.placeholder} />
      </View>

      {/* Summary Cards */}
      <View style={styles.summaryContainer}>
        <View style={styles.summaryCard}>
          <View style={styles.summaryIconContainer}>
            <Ionicons name="time-outline" size={24} color="#4CAF50" />
          </View>
          <View style={styles.summaryInfo}>
            <Text style={styles.summaryValue}>{upcomingCount}</Text>
            <Text style={styles.summaryLabel}>Upcoming</Text>
          </View>
        </View>

        <View style={styles.summaryCard}>
          <View style={styles.summaryIconContainer}>
            <Ionicons name="checkmark-circle-outline" size={24} color="#2196F3" />
          </View>
          <View style={styles.summaryInfo}>
            <Text style={styles.summaryValue}>{completedCount}</Text>
            <Text style={styles.summaryLabel}>Completed</Text>
          </View>
        </View>

        <View style={styles.summaryCard}>
          <View style={styles.summaryIconContainer}>
            <Ionicons name="calendar-outline" size={24} color="#1a1a1a" />
          </View>
          <View style={styles.summaryInfo}>
            <Text style={styles.summaryValue}>{lessons.length}</Text>
            <Text style={styles.summaryLabel}>Total</Text>
          </View>
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'upcoming' && styles.filterTabActive]}
          onPress={() => setFilter('upcoming')}
        >
          <Text
            style={[
              styles.filterTabText,
              filter === 'upcoming' && styles.filterTabTextActive,
            ]}
          >
            Upcoming ({upcomingCount})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterTab, filter === 'completed' && styles.filterTabActive]}
          onPress={() => setFilter('completed')}
        >
          <Text
            style={[
              styles.filterTabText,
              filter === 'completed' && styles.filterTabTextActive,
            ]}
          >
            Completed ({completedCount})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Lessons List */}
      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {filteredLessons.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={64} color="#e0e0e0" />
            <Text style={styles.emptyStateTitle}>No lessons found</Text>
            <Text style={styles.emptyStateText}>
              {filter === 'upcoming'
                ? 'You have no upcoming lessons today'
                : 'No completed lessons yet'}
            </Text>
          </View>
        ) : (
          <View style={styles.lessonsList}>
            {filteredLessons.map((lesson) => (
              <View key={lesson.id} style={styles.lessonCard}>
                {/* Time & Type */}
                <View style={styles.lessonHeader}>
                  <View style={styles.timeContainer}>
                    <Ionicons name="time-outline" size={20} color="#1a1a1a" />
                    <Text style={styles.timeText}>
                      {formatTime(lesson.startTime)} - {formatTime(lesson.endTime)}
                    </Text>
                  </View>
                  <View style={styles.typeContainer}>
                    <Ionicons 
                      name={getLessonTypeIcon(lesson.type)} 
                      size={16} 
                      color="#666" 
                    />
                    <Text style={styles.typeText}>
                      {lesson.type === LessonType.PRACTICAL ? 'Practical' : 'Theory'}
                    </Text>
                  </View>
                </View>

                {/* Student Info */}
                <View style={styles.lessonBody}>
                  <View style={styles.studentContainer}>
                    <View style={styles.studentAvatar}>
                      <Ionicons name="person" size={24} color="#666" />
                    </View>
                    <View style={styles.studentInfo}>
                      <Text style={styles.studentLabel}>Student</Text>
                      <Text style={styles.studentName}>
                        Student #{lesson.studentId.slice(0, 8)}
                      </Text>
                    </View>
                  </View>

                  {/* Status & Price */}
                  <View style={styles.lessonFooter}>
                    <View
                      style={[
                        styles.statusBadge,
                        { backgroundColor: `${getStatusColor(lesson.status)}20` },
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusText,
                          { color: getStatusColor(lesson.status) },
                        ]}
                      >
                        {lesson.status.charAt(0).toUpperCase() + lesson.status.slice(1)}
                      </Text>
                    </View>
                    <Text style={styles.price}>${lesson.price}</Text>
                  </View>
                </View>

                {/* Notes */}
                {lesson.notes && (
                  <View style={styles.notesContainer}>
                    <Ionicons name="document-text-outline" size={14} color="#666" />
                    <Text style={styles.notesText}>{lesson.notes}</Text>
                  </View>
                )}

                {/* Actions */}
                {lesson.status === LessonStatus.SCHEDULED && (
                  <View style={styles.lessonActions}>
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => handleViewStudent(lesson)}
                    >
                      <Ionicons name="person-outline" size={18} color="#666" />
                      <Text style={styles.actionButtonText}>View Student</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.actionButton, styles.actionButtonPrimary]}
                      onPress={() => handleMarkComplete(lesson)}
                    >
                      <Ionicons name="checkmark-circle-outline" size={18} color="#ffffff" />
                      <Text style={[styles.actionButtonText, styles.actionButtonTextPrimary]}>
                        Mark Complete
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerInfo: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  headerDate: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  placeholder: {
    width: 40,
  },
  summaryContainer: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    gap: 12,
    marginBottom: 20,
  },
  summaryCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
    borderRadius: 12,
    padding: 12,
    gap: 12,
  },
  summaryIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryInfo: {
    flex: 1,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  summaryLabel: {
    fontSize: 11,
    color: '#666',
    marginTop: 2,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    marginBottom: 20,
    gap: 8,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#f8f8f8',
    alignItems: 'center',
  },
  filterTabActive: {
    backgroundColor: '#1a1a1a',
  },
  filterTabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  filterTabTextActive: {
    color: '#ffffff',
  },
  content: {
    flex: 1,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1a1a1a',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  lessonsList: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  lessonCard: {
    backgroundColor: '#f8f8f8',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  lessonHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timeText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  typeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ffffff',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  typeText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#666',
  },
  lessonBody: {
    gap: 12,
  },
  studentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  studentAvatar: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  studentInfo: {
    flex: 1,
  },
  studentLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 2,
  },
  studentName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  lessonFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusBadge: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  price: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  notesContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  notesText: {
    flex: 1,
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },
  lessonActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#ffffff',
    paddingVertical: 12,
    borderRadius: 10,
  },
  actionButtonPrimary: {
    backgroundColor: '#1a1a1a',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  actionButtonTextPrimary: {
    color: '#ffffff',
  },
});
