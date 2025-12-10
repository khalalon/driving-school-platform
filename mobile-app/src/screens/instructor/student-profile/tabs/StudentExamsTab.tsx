/**
 * Student Exams Tab - Exam History & Payment Tracking
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
  ExamHistory,
} from '../../../../services/api/StudentProfileService';
import { colors, typography, spacing, shadows } from '../../../../theme';

export const StudentExamsTab = ({ route }: any) => {
  const { studentId, schoolId } = route.params;

  const [loading, setLoading] = useState(true);
  const [exams, setExams] = useState<ExamHistory[]>([]);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedExam, setSelectedExam] = useState<ExamHistory | null>(null);
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    loadExams();
  }, []);

  const loadExams = async () => {
    try {
      setLoading(true);
      const data = await studentProfileService.getStudentExams(studentId, schoolId);
      setExams(data);
    } catch (error: any) {
      Alert.alert('Error', 'Failed to load exams');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkPaid = (exam: ExamHistory) => {
    setSelectedExam(exam);
    setAmount(exam.amount?.toString() || '');
    setShowPaymentModal(true);
  };

  const confirmPayment = async () => {
    if (!selectedExam || !amount || parseFloat(amount) <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount');
      return;
    }

    try {
      setProcessing(true);
      await studentProfileService.markExamPaid(
        selectedExam.id,
        parseFloat(amount),
        paymentMethod
      );
      Alert.alert('Success', 'Exam marked as paid');
      setShowPaymentModal(false);
      setSelectedExam(null);
      setAmount('');
      loadExams();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to mark as paid');
    } finally {
      setProcessing(false);
    }
  };

  const getResultColor = (result?: string) => {
    switch (result) {
      case 'passed':
        return colors.success[600];
      case 'failed':
        return colors.error[600];
      default:
        return colors.warning[600];
    }
  };

  const getResultIcon = (result?: string) => {
    switch (result) {
      case 'passed':
        return 'checkmark-circle';
      case 'failed':
        return 'close-circle';
      default:
        return 'time-outline';
    }
  };

  const renderExam = ({ item }: { item: ExamHistory }) => (
    <View style={styles.examCard}>
      <View style={styles.examHeader}>
        <View style={styles.typeContainer}>
          <Ionicons
            name={item.examType === 'theory' ? 'book-outline' : 'car-outline'}
            size={24}
            color={colors.primary[600]}
          />
          <Text style={styles.examType}>
            {item.examType === 'theory' ? 'Theory Exam' : 'Practical Exam'}
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

      <View style={styles.examDetails}>
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

        {item.result && (
          <View style={styles.resultContainer}>
            <Ionicons
              name={getResultIcon(item.result)}
              size={24}
              color={getResultColor(item.result)}
            />
            <Text style={[styles.resultText, { color: getResultColor(item.result) }]}>
              {item.result.toUpperCase()}
            </Text>
            {item.score !== null && item.score !== undefined && (
              <Text style={styles.scoreText}>Score: {item.score}/100</Text>
            )}
          </View>
        )}

        {item.amount && (
          <View style={styles.detailRow}>
            <Ionicons name="cash-outline" size={16} color={colors.text.secondary} />
            <Text style={styles.detailText}>€{item.amount.toFixed(2)}</Text>
          </View>
        )}
      </View>

      {item.notes && (
        <View style={styles.notesContainer}>
          <Text style={styles.notesLabel}>Notes:</Text>
          <Text style={styles.notesText}>{item.notes}</Text>
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
      <Ionicons name="clipboard-outline" size={64} color={colors.neutral[400]} />
      <Text style={styles.emptyTitle}>No Exams</Text>
      <Text style={styles.emptySubtitle}>This student hasn't registered for any exams yet</Text>
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
        data={exams}
        renderItem={renderExam}
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
              <Text style={styles.modalTitle}>Mark Exam as Paid</Text>
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
  examCard: {
    backgroundColor: colors.background.primary,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  examHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  typeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  examType: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
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
  examDetails: {
    gap: spacing.sm,
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
  resultContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    backgroundColor: colors.background.secondary,
    borderRadius: 8,
    gap: spacing.sm,
  },
  resultText: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.bold,
  },
  scoreText: {
    fontSize: typography.size.sm,
    color: colors.text.secondary,
    marginLeft: 'auto',
  },
  notesContainer: {
    marginTop: spacing.sm,
    padding: spacing.sm,
    backgroundColor: colors.background.secondary,
    borderRadius: 8,
  },
  notesLabel: {
    fontSize: typography.size.sm,
    color: colors.text.secondary,
    fontWeight: typography.weight.semibold,
    marginBottom: 4,
  },
  notesText: {
    fontSize: typography.size.sm,
    color: colors.text.primary,
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
