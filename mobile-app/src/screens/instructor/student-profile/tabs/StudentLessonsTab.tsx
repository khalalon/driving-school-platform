/**
 * Student Lessons Tab - Lesson History & Payment Tracking
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  Modal,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  studentProfileService,
  LessonHistory,
} from '../../../../services/api/StudentProfileService';
import { colors, typography, spacing, shadows } from '../../../../theme';

export const StudentLessonsTab = ({ route }: any) => {
  const { studentId, schoolId } = route.params;

  const [loading, setLoading] = useState(true);
  const [lessons, setLessons] = useState<LessonHistory[]>([]);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedLesson, setSelectedLesson] = useState<LessonHistory | null>(null);
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    loadLessons();
  }, []);

  const loadLessons = async () => {
    try {
      setLoading(true);
      const data = await studentProfileService.getStudentLessons(studentId, schoolId);
      setLessons(data);
    } catch (error: any) {
      Alert.alert('Error', 'Failed to load lessons');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkPaid = (lesson: LessonHistory) => {
    setSelectedLesson(lesson);
    setAmount(lesson.amount?.toString() || '');
    setShowPaymentModal(true);
  };

  const confirmPayment = async () => {
    if (!selectedLesson || !amount || parseFloat(amount) <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount');
      return;
    }

    try {
      setProcessing(true);
      await studentProfileService.markLessonPaid(
        selectedLesson.id,
        parseFloat(amount),
        paymentMethod
      );
      Alert.alert('Success', 'Lesson marked as paid');
      setShowPaymentModal(false);
      setSelectedLesson(null);
      setAmount('');
      loadLessons();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to mark as paid');
    } finally {
      setProcessing(false);
    }
  };

  const getLessonTypeColor = (type: string) => {
    switch (type) {
      case 'CODE':
        return colors.primary[600];
      case 'Manœuvre':
        return colors.warning[600];
      case 'Parc':
        return colors.success[600];
      default:
        return colors.neutral[600];
    }
  };

  const renderLesson = ({ item }: { item: LessonHistory }) => (
    <View style={styles.lessonCard}>
      <View style={styles.lessonHeader}>
        <View style={[styles.typeBadge, { backgroundColor: `${getLessonTypeColor(item.lessonType)}20` }]}>
          <Text style={[styles.typeText, { color: getLessonTypeColor(item.lessonType) }]}>
            {item.lessonType}
          </Text>
        </View>
        <View style={[styles.statusBadge, item.paid ? styles.paidBadge : styles.unpaidBadge]}>
          <Ionicons
            name={item.paid ? 'checkmark-circle' : 'time-outline'}
            size={16}
            color={item.paid ? colors.success[600] : colors.warning[600]}
          />
          <Text style={[styles.statusText, item.paid ? styles.paidText : styles.unpaidText]}>
            {item.paid ? 'Paid' : 'Unpaid'}
          </Text>
        </View>
      </View>

      <View style={styles.lessonDetails}>
        <View style={styles.detailRow}>
          <Ionicons name="calendar-outline" size={16} color={colors.text.secondary} />
          <Text style={styles.detailText}>
            {new Date(item.dateTime).toLocaleDateString()} at{' '}
            {new Date(item.dateTime).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
        </View>

        <View style={styles.detailRow}>
          <Ionicons name="person-outline" size={16} color={colors.text.secondary} />
          <Text style={styles.detailText}>{item.instructorName}</Text>
        </View>

        <View style={styles.detailRow}>
          <Ionicons name="time-outline" size={16} color={colors.text.secondary} />
          <Text style={styles.detailText}>{item.duration} minutes</Text>
        </View>

        {item.attended !== null && item.attended !== undefined && (
          <View style={styles.detailRow}>
            <Ionicons
              name={item.attended ? 'checkmark-circle-outline' : 'close-circle-outline'}
              size={16}
              color={item.attended ? colors.success[600] : colors.error[600]}
            />
            <Text
              style={[
                styles.detailText,
                { color: item.attended ? colors.success[600] : colors.error[600] },
              ]}
            >
              {item.attended ? 'Attended' : 'Absent'}
            </Text>
          </View>
        )}

        {item.amount && (
          <View style={styles.detailRow}>
            <Ionicons name="cash-outline" size={16} color={colors.text.secondary} />
            <Text style={styles.detailText}>€{item.amount.toFixed(2)}</Text>
          </View>
        )}
      </View>

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
              color={colors.warning[600]}
            />
          ))}
        </View>
      )}

      {!item.paid && (
        <TouchableOpacity
          style={styles.markPaidButton}
          onPress={() => handleMarkPaid(item)}
          activeOpacity={0.7}
        >
          <Ionicons name="checkmark-circle-outline" size={20} color={colors.text.inverse} />
          <Text style={styles.markPaidText}>Mark as Paid</Text>
        </TouchableOpacity>
      )}

      {item.paid && item.paymentDate && (
        <View style={styles.paymentInfo}>
          <Text style={styles.paymentInfoText}>
            Paid on {new Date(item.paymentDate).toLocaleDateString()} via {item.paymentMethod}
          </Text>
        </View>
      )}
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="car-outline" size={64} color={colors.neutral[400]} />
      <Text style={styles.emptyTitle}>No Lessons</Text>
      <Text style={styles.emptySubtitle}>This student hasn't booked any lessons yet</Text>
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
      <FlatList
        data={lessons}
        renderItem={renderLesson}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={renderEmpty}
        showsVerticalScrollIndicator={false}
      />

      {/* Payment Modal */}
      <Modal
        visible={showPaymentModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPaymentModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Mark Lesson as Paid</Text>
              <TouchableOpacity
                onPress={() => setShowPaymentModal(false)}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={24} color={colors.text.secondary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Amount (€)</Text>
            <TextInput
              style={styles.input}
              placeholder="0.00"
              placeholderTextColor={colors.neutral[400]}
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
            />

            <Text style={styles.inputLabel}>Payment Method</Text>
            <View style={styles.methodButtons}>
              {['cash', 'card', 'bank_transfer', 'online'].map((method) => (
                <TouchableOpacity
                  key={method}
                  style={[
                    styles.methodButton,
                    paymentMethod === method && styles.methodButtonActive,
                  ]}
                  onPress={() => setPaymentMethod(method)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.methodText,
                      paymentMethod === method && styles.methodTextActive,
                    ]}
                  >
                    {method.replace('_', ' ').toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowPaymentModal(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={confirmPayment}
                disabled={processing}
                activeOpacity={0.7}
              >
                {processing ? (
                  <ActivityIndicator size="small" color={colors.text.inverse} />
                ) : (
                  <Text style={styles.confirmButtonText}>Confirm Payment</Text>
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
  },
  listContent: {
    padding: spacing.md,
    flexGrow: 1,
  },
  lessonCard: {
    backgroundColor: colors.background.primary,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  lessonHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  typeBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 6,
  },
  typeText: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 6,
    gap: 4,
  },
  paidBadge: {
    backgroundColor: colors.success[50],
  },
  unpaidBadge: {
    backgroundColor: colors.warning[50],
  },
  statusText: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
  },
  paidText: {
    color: colors.success[600],
  },
  unpaidText: {
    color: colors.warning[600],
  },
  lessonDetails: {
    gap: spacing.xs,
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
    backgroundColor: colors.background.secondary,
    borderRadius: 8,
  },
  feedbackLabel: {
    fontSize: typography.size.sm,
    color: colors.text.secondary,
    fontWeight: typography.weight.semibold,
    marginBottom: 4,
  },
  feedbackText: {
    fontSize: typography.size.sm,
    color: colors.text.primary,
  },
  ratingContainer: {
    flexDirection: 'row',
    marginTop: spacing.sm,
    gap: 4,
  },
  markPaidButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.success[600],
    borderRadius: 8,
    paddingVertical: spacing.sm,
    marginTop: spacing.sm,
    gap: spacing.xs,
  },
  markPaidText: {
    fontSize: typography.size.base,
    color: colors.text.inverse,
    fontWeight: typography.weight.semibold,
  },
  paymentInfo: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.neutral[200],
  },
  paymentInfoText: {
    fontSize: typography.size.sm,
    color: colors.text.secondary,
    fontStyle: 'italic',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.xl * 2,
  },
  emptyTitle: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
    marginTop: spacing.md,
  },
  emptySubtitle: {
    fontSize: typography.size.base,
    color: colors.text.secondary,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.background.primary,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: spacing.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  modalTitle: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
  },
  inputLabel: {
    fontSize: typography.size.base,
    color: colors.text.primary,
    fontWeight: typography.weight.semibold,
    marginBottom: spacing.xs,
    marginTop: spacing.sm,
  },
  input: {
    fontSize: typography.size.base,
    backgroundColor: colors.background.secondary,
    borderRadius: 8,
    padding: spacing.md,
    color: colors.text.primary,
  },
  methodButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  methodButton: {
    flex: 1,
    minWidth: '45%',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 8,
    backgroundColor: colors.background.secondary,
    alignItems: 'center',
  },
  methodButtonActive: {
    backgroundColor: colors.primary[600],
  },
  methodText: {
    fontSize: typography.size.sm,
    color: colors.text.secondary,
    fontWeight: typography.weight.medium,
  },
  methodTextActive: {
    color: colors.text.inverse,
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  modalButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: colors.background.secondary,
  },
  confirmButton: {
    backgroundColor: colors.success[600],
  },
  cancelButtonText: {
    fontSize: typography.size.base,
    color: colors.text.primary,
    fontWeight: typography.weight.semibold,
  },
  confirmButtonText: {
    fontSize: typography.size.base,
    color: colors.text.inverse,
    fontWeight: typography.weight.semibold,
  },
});
