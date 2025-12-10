/**
 * My Lessons & Payment Tab
 * Single Responsibility: Display lesson history with payment status
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { studentSelfProfileService, MyLessonHistory } from '../../../../services/api/StudentSelfProfileService';
import { colors, typography, spacing } from '../../../../theme';

export const MyLessonsPaymentTab = ({ route }: any) => {
  const { schoolId } = route.params;
  const [loading, setLoading] = useState(true);
  const [lessons, setLessons] = useState<MyLessonHistory[]>([]);

  useEffect(() => {
    loadLessons();
  }, [schoolId]);

  const loadLessons = async () => {
    try {
      setLoading(true);
      const data = await studentSelfProfileService.getMyLessons(schoolId);
      setLessons(data);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to load lessons');
    } finally {
      setLoading(false);
    }
  };

  const renderLesson = ({ item }: { item: MyLessonHistory }) => (
    <View style={styles.lessonCard}>
      {/* Header */}
      <View style={styles.lessonHeader}>
        <View style={styles.lessonInfo}>
          <Text style={styles.lessonType}>{item.lessonType}</Text>
          <Text style={styles.lessonDate}>
            {new Date(item.dateTime).toLocaleDateString()} at{' '}
            {new Date(item.dateTime).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
        </View>
        {item.attended !== undefined && (
          <View
            style={[
              styles.statusBadge,
              item.attended ? styles.statusAttended : styles.statusMissed,
            ]}
          >
            <Text style={styles.statusText}>
              {item.attended ? 'Attended' : 'Missed'}
            </Text>
          </View>
        )}
      </View>

      {/* Details */}
      <View style={styles.lessonDetails}>
        <View style={styles.detailRow}>
          <Ionicons name="person-outline" size={16} color={colors.text.secondary} />
          <Text style={styles.detailText}>{item.instructorName}</Text>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="time-outline" size={16} color={colors.text.secondary} />
          <Text style={styles.detailText}>{item.duration} minutes</Text>
        </View>
      </View>

      {/* Feedback & Rating */}
      {item.feedback && (
        <View style={styles.feedbackContainer}>
          <Text style={styles.feedbackLabel}>Feedback:</Text>
          <Text style={styles.feedbackText}>{item.feedback}</Text>
        </View>
      )}
      {item.rating && (
        <View style={styles.ratingContainer}>
          {[1, 2, 3, 4, 5].map((star) => (
            <Ionicons
              key={star}
              name={star <= item.rating! ? 'star' : 'star-outline'}
              size={16}
              color={colors.warning[500]}
            />
          ))}
        </View>
      )}

      {/* Payment Status */}
      <View style={styles.paymentSection}>
        <View style={styles.paymentRow}>
          <View style={styles.paymentLabel}>
            <Ionicons
              name={item.paid ? 'checkmark-circle' : 'alert-circle-outline'}
              size={20}
              color={item.paid ? colors.success[500] : colors.warning[500]}
            />
            <Text style={styles.paymentLabelText}>
              {item.paid ? 'Paid' : 'Pending Payment'}
            </Text>
          </View>
          {item.amount && (
            <Text
              style={[
                styles.paymentAmount,
                { color: item.paid ? colors.success[500] : colors.warning[500] },
              ]}
            >
              ${item.amount.toFixed(2)}
            </Text>
          )}
        </View>
        {item.paid && item.paymentDate && (
          <Text style={styles.paymentDate}>
            Paid on {new Date(item.paymentDate).toLocaleDateString()}
          </Text>
        )}
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary[600]} />
      </View>
    );
  }

  if (lessons.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="calendar-outline" size={48} color={colors.text.tertiary} />
        <Text style={styles.emptyText}>No lessons recorded yet</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={lessons}
      renderItem={renderLesson}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.listContainer}
      showsVerticalScrollIndicator={false}
    />
  );
};

const styles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background.secondary,
  },
  emptyText: {
    fontSize: typography.size.base,
    color: colors.text.tertiary,
    marginTop: spacing.md,
  },
  listContainer: {
    padding: spacing.md,
    backgroundColor: colors.background.secondary,
  },
  lessonCard: {
    backgroundColor: colors.background.primary,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
    shadowColor: colors.neutral[900],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  lessonHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  lessonInfo: {
    flex: 1,
  },
  lessonType: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
    marginBottom: spacing.xs / 2,
  },
  lessonDate: {
    fontSize: typography.size.sm,
    color: colors.text.secondary,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    borderRadius: 12,
  },
  statusAttended: {
    backgroundColor: colors.success[50],
  },
  statusMissed: {
    backgroundColor: colors.error[50],
  },
  statusText: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.medium,
    color: colors.text.primary,
  },
  lessonDetails: {
    gap: spacing.xs,
    marginBottom: spacing.sm,
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
  feedbackContainer: {
    marginTop: spacing.sm,
    padding: spacing.sm,
    backgroundColor: colors.neutral[50],
    borderRadius: 8,
  },
  feedbackLabel: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.medium,
    color: colors.text.secondary,
    marginBottom: spacing.xs / 2,
  },
  feedbackText: {
    fontSize: typography.size.sm,
    color: colors.text.primary,
    lineHeight: 20,
  },
  ratingContainer: {
    flexDirection: 'row',
    gap: spacing.xs / 2,
    marginTop: spacing.sm,
  },
  paymentSection: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.neutral[200],
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  paymentLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  paymentLabelText: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.medium,
    color: colors.text.primary,
  },
  paymentAmount: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.semibold,
  },
  paymentDate: {
    fontSize: typography.size.xs,
    color: colors.text.secondary,
    marginTop: spacing.xs / 2,
  },
});
