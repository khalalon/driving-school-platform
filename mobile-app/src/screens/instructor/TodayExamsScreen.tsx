/**
 * Today Exams Screen - Minimal & Elegant
 * Single Responsibility: The school's exams of the day (X1 status=scheduled,completed) and
 * their results (X5)
 *
 * Pas d'instructeur attitré (D-33) : tout instructeur de l'école enregistre le résultat
 * (D-20). Le score est facultatif : un examen de conduite est admis ou ajourné sans note.
 * X1 n'a pas de filtre de date : le jour est filtré ici, en heure locale.
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
import { getApiErrorMessage } from '../../services/api/ApiError';
import { useI18n } from '../../context/LanguageContext';
import { examTypeLabel, Exam, ExamResult, ExamStatus, ExamType } from '../../models/Exam';
import { formatPersonName, formatTime, toLocalDateKey } from '../../utils/format';
import { colors, typography, spacing, shadows } from '../../theme';

const studentOf = (exam: Exam) =>
  formatPersonName({ firstName: exam.studentFirstName, lastName: exam.studentLastName }, 'Student');

export const TodayExamsScreen = ({ navigation }: any) => {
  const { t } = useI18n();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [exams, setExams] = useState<Exam[]>([]);
  const [processing, setProcessing] = useState(false);

  // Record result modal (X5)
  const [showResultModal, setShowResultModal] = useState(false);
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null);
  const [result, setResult] = useState<ExamResult.PASSED | ExamResult.FAILED>(ExamResult.PASSED);
  const [score, setScore] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    loadTodayExams();
  }, []);

  const loadTodayExams = async () => {
    try {
      setLoading(true);
      // X1 : examens planifiés ou passés de l'école, puis ceux d'aujourd'hui (jour local)
      const all = await examService.getMyExams({
        status: [ExamStatus.SCHEDULED, ExamStatus.COMPLETED],
      });
      const today = toLocalDateKey();
      setExams(
        all.filter((exam) => exam.dateTime && toLocalDateKey(new Date(exam.dateTime)) === today)
      );
    } catch (error) {
      Alert.alert(t('common.error'), getApiErrorMessage(error, t('todayExams.loadFailed')));
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadTodayExams();
    setRefreshing(false);
  }, []);

  const openResult = (exam: Exam) => {
    setSelectedExam(exam);
    setResult(ExamResult.PASSED);
    setScore('');
    setNotes('');
    setShowResultModal(true);
  };

  const closeResult = () => {
    setShowResultModal(false);
    setSelectedExam(null);
  };

  const confirmRecordResult = async () => {
    if (!selectedExam) return;

    // Score facultatif (D-33) ; s'il est saisi, entier de 0 à 100
    let scoreValue: number | undefined;
    if (score.trim() !== '') {
      scoreValue = Number.parseInt(score, 10);
      if (!Number.isInteger(scoreValue) || scoreValue < 0 || scoreValue > 100) {
        Alert.alert(t('todayExams.invalidScore'), t('todayExams.invalidScoreText'));
        return;
      }
    }

    try {
      setProcessing(true);
      // X5 : passed | failed, score et notes facultatifs → completed
      await examService.recordExamResult(selectedExam.id, {
        result,
        score: scoreValue,
        notes: notes.trim() || undefined,
      });
      Alert.alert(t('common.success'), t('todayExams.recorded'));
      closeResult();
      loadTodayExams();
    } catch (error) {
      Alert.alert(t('common.error'), getApiErrorMessage(error, t('todayExams.recordFailed')));
      loadTodayExams();
    } finally {
      setProcessing(false);
    }
  };

  const renderExamCard = ({ item }: { item: Exam }) => {
    const isCompleted = item.status === ExamStatus.COMPLETED;

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
            <Text style={styles.examType}>{examTypeLabel(item.type) ?? item.type} Exam</Text>
            <Text style={styles.studentName}>{studentOf(item)}</Text>
            <View style={styles.detailRow}>
              <Ionicons name="time-outline" size={16} color={colors.text.tertiary} />
              <Text style={styles.detailText}>{formatTime(item.dateTime)}</Text>
            </View>
            {item.location && (
              <View style={styles.detailRow}>
                <Ionicons name="location-outline" size={16} color={colors.text.tertiary} />
                <Text style={styles.detailText}>{item.location}</Text>
              </View>
            )}
          </View>

          {isCompleted && item.result !== ExamResult.PENDING && (
            <View
              style={[
                styles.resultBadge,
                {
                  backgroundColor:
                    item.result === ExamResult.PASSED ? colors.success[50] : colors.error[50],
                },
              ]}
            >
              <Ionicons
                name={item.result === ExamResult.PASSED ? 'checkmark-circle' : 'close-circle'}
                size={24}
                color={item.result === ExamResult.PASSED ? colors.success[500] : colors.error[500]}
              />
            </View>
          )}
        </View>

        {!isCompleted && (
          <TouchableOpacity
            style={styles.recordButton}
            onPress={() => openResult(item)}
            activeOpacity={0.7}
            disabled={processing}
          >
            <Ionicons name="create-outline" size={20} color={colors.primary[600]} />
            <Text style={styles.recordButtonText}>{t('todayExams.recordResult')}</Text>
          </TouchableOpacity>
        )}

        {isCompleted && item.score !== null && (
          <View style={styles.scoreBox}>
            <Text style={styles.scoreLabel}>{t('myExams.score')}</Text>
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
      <Text style={styles.emptyTitle}>{t('todayExams.emptyTitle')}</Text>
      <Text style={styles.emptyText}>{t('todayExams.emptyText')}</Text>
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
        <Text style={styles.headerTitle}>{t('todayExams.title')}</Text>
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

      {/* Record Result Modal (X5) */}
      <Modal
        visible={showResultModal}
        transparent
        animationType="fade"
        onRequestClose={closeResult}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('todayExams.recordResult')}</Text>
              <TouchableOpacity onPress={closeResult}>
                <Ionicons name="close" size={24} color={colors.text.secondary} />
              </TouchableOpacity>
            </View>

            {selectedExam && (
              <Text style={styles.modalSubtitle}>
                {examTypeLabel(selectedExam.type)} exam of {studentOf(selectedExam)} at{' '}
                {formatTime(selectedExam.dateTime)}
              </Text>
            )}

            <View style={styles.section}>
              <Text style={styles.label}>{t('todayExams.result')}</Text>
              <View style={styles.resultButtons}>
                <TouchableOpacity
                  style={[
                    styles.resultButton,
                    result === ExamResult.PASSED && styles.resultButtonPass,
                  ]}
                  onPress={() => setResult(ExamResult.PASSED)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name="checkmark-circle"
                    size={24}
                    color={
                      result === ExamResult.PASSED ? colors.success[600] : colors.text.tertiary
                    }
                  />
                  <Text
                    style={[
                      styles.resultButtonText,
                      result === ExamResult.PASSED && styles.resultButtonTextActive,
                    ]}
                  >
                    Passed
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.resultButton,
                    result === ExamResult.FAILED && styles.resultButtonFail,
                  ]}
                  onPress={() => setResult(ExamResult.FAILED)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name="close-circle"
                    size={24}
                    color={result === ExamResult.FAILED ? colors.error[600] : colors.text.tertiary}
                  />
                  <Text
                    style={[
                      styles.resultButtonText,
                      result === ExamResult.FAILED && styles.resultButtonTextActive,
                    ]}
                  >
                    Failed
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.label}>{t('todayExams.scoreLabel')}</Text>
              <TextInput
                style={styles.scoreInput}
                placeholder={t('todayExams.scorePlaceholder')}
                placeholderTextColor={colors.neutral[400]}
                value={score}
                onChangeText={setScore}
                keyboardType="number-pad"
              />
            </View>

            <View style={styles.section}>
              <Text style={styles.label}>{t('todayExams.notes')}</Text>
              <TextInput
                style={styles.notesInput}
                placeholder={t('todayExams.notesPlaceholder')}
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
                onPress={closeResult}
                activeOpacity={0.7}
              >
                <Text style={styles.modalCancelText}>{t('common.cancel')}</Text>
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
                  <Text style={styles.modalSubmitText}>{t('todayExams.saveResult')}</Text>
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
  studentName: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.medium,
    color: colors.text.secondary,
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
