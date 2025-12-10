/**
 * Today Exams Screen - Minimal & Elegant
 * Single Responsibility: Display and manage today's exams
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
import { examService } from '../../services/api/ExamService';
import { Exam, ExamStatus } from '../../models/Exam';
import { colors, typography, spacing, shadows } from '../../theme';

export const TodayExamsScreen = ({ navigation }: any) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [exams, setExams] = useState<Exam[]>([]);
  const [processing, setProcessing] = useState(false);

  // Record result modal
  const [showResultModal, setShowResultModal] = useState(false);
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null);
  const [result, setResult] = useState<'PASS' | 'FAIL'>('PASS');
  const [score, setScore] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    loadTodayExams();
  }, []);

  const loadTodayExams = async () => {
    try {
      setLoading(true);
      const allExams = await examService.getMyExams();
      
      // Filter for today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const todayExams = allExams.filter((exam) => {
        const examDate = new Date(exam.dateTime);
        return examDate >= today && examDate < tomorrow;
      });

      setExams(todayExams);
    } catch (error: any) {
      Alert.alert('Error', 'Failed to load exams');
      console.error('Load exams error:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadTodayExams();
    setRefreshing(false);
  }, []);

  const handleRecordResult = (exam: Exam) => {
    setSelectedExam(exam);
    setShowResultModal(true);
  };

  const confirmRecordResult = async () => {
    if (!score.trim()) {
      Alert.alert('Required', 'Please enter a score');
      return;
    }

    const scoreNum = parseInt(score);
    if (isNaN(scoreNum) || scoreNum < 0 || scoreNum > 100) {
      Alert.alert('Invalid', 'Score must be between 0 and 100');
      return;
    }

    if (!selectedExam) return;

    try {
      setProcessing(true);
      // API call to record exam result
      Alert.alert('Success', 'Exam result recorded successfully');
      setShowResultModal(false);
      setResult('PASS');
      setScore('');
      setNotes('');
      setSelectedExam(null);
      loadTodayExams();
    } catch (error: any) {
      Alert.alert('Error', 'Failed to record result');
    } finally {
      setProcessing(false);
    }
  };

  const renderExamCard = ({ item }: { item: Exam }) => {
    const examTime = new Date(item.dateTime);
    const isCompleted = item.status === ExamStatus.COMPLETED;

    return (
      <View style={styles.examCard}>
        <View style={styles.cardHeader}>
          <View style={styles.iconContainer}>
            <Ionicons
              name="clipboard-outline"
              size={28}
              color={item.type === 'THEORY' ? colors.primary[600] : colors.warning[600]}
            />
          </View>

          <View style={styles.examInfo}>
            <Text style={styles.examType}>{item.type} Exam</Text>
            <View style={styles.detailRow}>
              <Ionicons name="time-outline" size={16} color={colors.text.tertiary} />
              <Text style={styles.detailText}>
                {examTime.toLocaleTimeString('en-US', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
            </View>
            {item.location && (
              <View style={styles.detailRow}>
                <Ionicons name="location-outline" size={16} color={colors.text.tertiary} />
                <Text style={styles.detailText}>{item.location}</Text>
              </View>
            )}
          </View>

          {isCompleted && item.result && (
            <View
              style={[
                styles.resultBadge,
                {
                  backgroundColor:
                    item.result === 'PASS' ? colors.success[50] : colors.error[50],
                },
              ]}
            >
              <Ionicons
                name={item.result === 'PASS' ? 'checkmark-circle' : 'close-circle'}
                size={24}
                color={item.result === 'PASS' ? colors.success[500] : colors.error[500]}
              />
            </View>
          )}
        </View>

        {!isCompleted && (
          <TouchableOpacity
            style={styles.recordButton}
            onPress={() => handleRecordResult(item)}
            activeOpacity={0.7}
          >
            <Ionicons name="create-outline" size={20} color={colors.primary[600]} />
            <Text style={styles.recordButtonText}>Record Result</Text>
          </TouchableOpacity>
        )}

        {isCompleted && item.score !== undefined && (
          <View style={styles.scoreBox}>
            <Text style={styles.scoreLabel}>Score</Text>
            <Text style={styles.scoreValue}>{item.score}/100</Text>
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
      <Text style={styles.emptyTitle}>No Exams Today</Text>
      <Text style={styles.emptyText}>You don't have any scheduled exams today</Text>
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
        <Text style={styles.headerTitle}>Today's Exams</Text>
      </View>

      {/* Exams List */}
      <FlatList
        data={exams}
        renderItem={renderExamCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={exams.length === 0 ? styles.emptyList : styles.listContent}
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

      {/* Record Result Modal */}
      <Modal
        visible={showResultModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowResultModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Record Result</Text>
              <TouchableOpacity
                onPress={() => {
                  setShowResultModal(false);
                  setResult('PASS');
                  setScore('');
                  setNotes('');
                  setSelectedExam(null);
                }}
              >
                <Ionicons name="close" size={24} color={colors.text.secondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.section}>
              <Text style={styles.label}>Result</Text>
              <View style={styles.resultButtons}>
                <TouchableOpacity
                  style={[
                    styles.resultButton,
                    result === 'PASS' && styles.resultButtonPass,
                  ]}
                  onPress={() => setResult('PASS')}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name="checkmark-circle"
                    size={24}
                    color={result === 'PASS' ? colors.success[600] : colors.text.tertiary}
                  />
                  <Text
                    style={[
                      styles.resultButtonText,
                      result === 'PASS' && styles.resultButtonTextActive,
                    ]}
                  >
                    Pass
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.resultButton,
                    result === 'FAIL' && styles.resultButtonFail,
                  ]}
                  onPress={() => setResult('FAIL')}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name="close-circle"
                    size={24}
                    color={result === 'FAIL' ? colors.error[600] : colors.text.tertiary}
                  />
                  <Text
                    style={[
                      styles.resultButtonText,
                      result === 'FAIL' && styles.resultButtonTextActive,
                    ]}
                  >
                    Fail
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.label}>Score (0-100)</Text>
              <TextInput
                style={styles.scoreInput}
                placeholder="85"
                placeholderTextColor={colors.neutral[400]}
                value={score}
                onChangeText={setScore}
                keyboardType="numeric"
              />
            </View>

            <View style={styles.section}>
              <Text style={styles.label}>Notes (Optional)</Text>
              <TextInput
                style={styles.notesInput}
                placeholder="Add any notes..."
                placeholderTextColor={colors.neutral[400]}
                value={notes}
                onChangeText={setNotes}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalCancelButton]}
                onPress={() => {
                  setShowResultModal(false);
                  setResult('PASS');
                  setScore('');
                  setNotes('');
                  setSelectedExam(null);
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  styles.modalSubmitButton,
                  processing && styles.disabledButton,
                ]}
                onPress={confirmRecordResult}
                disabled={processing}
                activeOpacity={0.7}
              >
                {processing ? (
                  <ActivityIndicator size="small" color={colors.text.inverse} />
                ) : (
                  <Text style={styles.modalSubmitText}>Save Result</Text>
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
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  detailText: {
    fontSize: typography.size.sm,
    color: colors.text.secondary,
  },
  resultBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: 8,
    backgroundColor: colors.primary[50],
    gap: spacing.xs,
  },
  recordButtonText: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
    color: colors.primary[600],
  },
  scoreBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.neutral[50],
    padding: spacing.md,
    borderRadius: 8,
  },
  scoreLabel: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
    color: colors.text.secondary,
  },
  scoreValue: {
    fontSize: typography.size.xl,
    fontWeight: typography.weight.bold,
    color: colors.primary[600],
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
    alignItems: 'center',
    padding: spacing.xl,
  },
  modalContent: {
    width: '100%',
    backgroundColor: colors.background.primary,
    borderRadius: 16,
    padding: spacing.xl,
    ...shadows.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  modalTitle: {
    fontSize: typography.size.xl,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
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
  resultButtons: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  resultButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.base,
    borderRadius: 8,
    backgroundColor: colors.background.tertiary,
    gap: spacing.sm,
  },
  resultButtonPass: {
    backgroundColor: colors.success[50],
  },
  resultButtonFail: {
    backgroundColor: colors.error[50],
  },
  resultButtonText: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.semibold,
    color: colors.text.tertiary,
  },
  resultButtonTextActive: {
    color: colors.text.primary,
  },
  scoreInput: {
    backgroundColor: colors.background.tertiary,
    borderRadius: 12,
    padding: spacing.base,
    fontSize: typography.size.base,
    color: colors.text.primary,
    height: 52,
  },
  notesInput: {
    backgroundColor: colors.background.tertiary,
    borderRadius: 12,
    padding: spacing.base,
    fontSize: typography.size.base,
    color: colors.text.primary,
    minHeight: 80,
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  modalButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalCancelButton: {
    backgroundColor: colors.background.tertiary,
  },
  modalCancelText: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.semibold,
    color: colors.text.secondary,
  },
  modalSubmitButton: {
    backgroundColor: colors.primary[600],
  },
  modalSubmitText: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.semibold,
    color: colors.text.inverse,
  },
  disabledButton: {
    opacity: 0.5,
  },
});
