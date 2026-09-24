/**
 * Examens du jour (11.4) — X1 `scheduled,completed` filtré sur le jour local, résultat X5.
 *
 * Pas d'instructeur attitré (D-33) : tout instructeur de l'école enregistre le résultat
 * (D-20). Le score est facultatif : un examen de conduite est admis ou ajourné sans note.
 * X1 n'a pas de filtre de date : le jour est filtré ici, en heure locale.
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Alert, FlatList, Modal, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { examService } from '../../services/api/ExamService';
import { getApiErrorMessage } from '../../services/api/ApiError';
import { useI18n } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
import { AppBar, Badge, Button, Card, EmptyState, Field, SkeletonCard } from '../../components/ui';
import {
  examResultLabel,
  examTypeLabel,
  Exam,
  ExamResult,
  ExamStatus,
  ExamType,
} from '../../models/Exam';
import { formatPersonName, formatTime, toLocalDateKey } from '../../utils/format';
import { Theme } from '../../theme';

export const TodayExamsScreen = ({ navigation }: any) => {
  const { t } = useI18n();
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [exams, setExams] = useState<Exam[]>([]);
  const [processing, setProcessing] = useState(false);

  // Résultat (X5)
  const [showResultModal, setShowResultModal] = useState(false);
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null);
  const [result, setResult] = useState<ExamResult.PASSED | ExamResult.FAILED>(ExamResult.PASSED);
  const [score, setScore] = useState('');
  const [notes, setNotes] = useState('');

  const studentOf = (exam: Exam) =>
    formatPersonName(
      { firstName: exam.studentFirstName, lastName: exam.studentLastName },
      t('today.student')
    );

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
    const theory = item.type === ExamType.THEORY;

    return (
      <Card style={styles.card}>
        <View style={styles.head}>
          <View style={[styles.icon, theory ? styles.iconTheory : styles.iconPractical]}>
            <Ionicons
              name={theory ? 'book' : 'car-sport'}
              size={24}
              color={theory ? theme.colors.accentText : theme.colors.warningText}
            />
          </View>

          <View style={styles.info}>
            <Text style={styles.type}>
              {t('myExams.examSuffix', { type: examTypeLabel(item.type) ?? item.type })}
            </Text>
            <Text style={styles.student}>{studentOf(item)}</Text>
            <View style={styles.metaRow}>
              <Ionicons name="time-outline" size={15} color={theme.colors.textMuted} />
              <Text style={styles.meta}>{formatTime(item.dateTime)}</Text>
            </View>
            {item.location ? (
              <View style={styles.metaRow}>
                <Ionicons name="location-outline" size={15} color={theme.colors.textMuted} />
                <Text style={styles.meta}>{item.location}</Text>
              </View>
            ) : null}
          </View>

          {isCompleted && item.result !== ExamResult.PENDING ? (
            <Badge
              label={examResultLabel(item.result)}
              tone={item.result === ExamResult.PASSED ? 'success' : 'danger'}
            />
          ) : null}
        </View>

        {!isCompleted ? (
          <Button
            title={t('todayExams.recordResult')}
            onPress={() => openResult(item)}
            variant="secondary"
            size="sm"
            icon="create-outline"
            disabled={processing}
          />
        ) : null}

        {isCompleted && item.score !== null ? (
          <View style={styles.score}>
            <Text style={styles.scoreLabel}>{t('myExams.score')}</Text>
            <Text style={styles.scoreValue}>{item.score}/100</Text>
          </View>
        ) : null}
      </Card>
    );
  };

  return (
    <View style={styles.flex}>
      <AppBar
        title={t('todayExams.title')}
        onBack={() => navigation.goBack()}
        backLabel={t('common.back')}
      />

      {loading && exams.length === 0 ? (
        <View style={styles.skeletons}>
          <SkeletonCard lines={3} />
          <SkeletonCard lines={3} />
        </View>
      ) : (
        <FlatList
          data={exams}
          renderItem={renderExamCard}
          keyExtractor={(item) => item.id}
          contentContainerStyle={exams.length === 0 ? styles.emptyList : styles.listContent}
          ListEmptyComponent={
            <EmptyState
              icon="ribbon-outline"
              title={t('todayExams.emptyTitle')}
              message={t('todayExams.emptyText')}
              tone="neutral"
            />
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[theme.colors.accent]}
              tintColor={theme.colors.accent}
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Résultat (X5) */}
      <Modal
        visible={showResultModal}
        transparent
        animationType="fade"
        onRequestClose={closeResult}
      >
        <View style={styles.overlay}>
          <Card style={styles.modal}>
            <Text style={styles.modalTitle}>{t('todayExams.recordResult')}</Text>

            {selectedExam ? (
              <Text style={styles.modalSubtitle}>
                {t('todayExams.modalSubtitle', {
                  type: examTypeLabel(selectedExam.type),
                  student: studentOf(selectedExam),
                  time: formatTime(selectedExam.dateTime),
                })}
              </Text>
            ) : null}

            <View style={styles.section}>
              <Text style={styles.label}>{t('todayExams.result')}</Text>
              <View style={styles.choices}>
                <Button
                  title={examResultLabel(ExamResult.PASSED)}
                  onPress={() => setResult(ExamResult.PASSED)}
                  variant={result === ExamResult.PASSED ? 'primary' : 'secondary'}
                  icon="checkmark-circle"
                  style={styles.choice}
                />
                <Button
                  title={examResultLabel(ExamResult.FAILED)}
                  onPress={() => setResult(ExamResult.FAILED)}
                  variant={result === ExamResult.FAILED ? 'danger' : 'secondary'}
                  icon="close-circle"
                  style={styles.choice}
                />
              </View>
            </View>

            <Field
              label={t('todayExams.scoreLabel')}
              placeholder={t('todayExams.scorePlaceholder')}
              value={score}
              onChangeText={setScore}
              keyboardType="number-pad"
            />

            <Field
              label={t('todayExams.notes')}
              placeholder={t('todayExams.notesPlaceholder')}
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              style={styles.notes}
            />

            <View style={styles.actions}>
              <Button
                title={t('common.cancel')}
                onPress={closeResult}
                variant="secondary"
                style={styles.action}
              />
              <Button
                title={t('common.save')}
                onPress={confirmRecordResult}
                loading={processing}
                style={styles.action}
              />
            </View>
          </Card>
        </View>
      </Modal>
    </View>
  );
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    flex: { flex: 1, backgroundColor: theme.colors.surface },
    skeletons: { padding: theme.spacing.base, gap: theme.spacing.md },
    listContent: { padding: theme.spacing.base, gap: theme.spacing.md },
    emptyList: { flexGrow: 1, justifyContent: 'center' },
    card: { gap: theme.spacing.md },
    head: { flexDirection: 'row', alignItems: 'flex-start', gap: theme.spacing.md },
    icon: {
      width: 48,
      height: 48,
      borderRadius: theme.radius.lg,
      alignItems: 'center',
      justifyContent: 'center',
    },
    iconTheory: { backgroundColor: theme.colors.accentSoft },
    iconPractical: { backgroundColor: theme.colors.warningSoft },
    info: { flex: 1, gap: 2 },
    type: {
      fontSize: theme.typography.size.base,
      fontWeight: theme.typography.weight.semibold,
      color: theme.colors.textPrimary,
    },
    student: { fontSize: theme.typography.size.sm, color: theme.colors.textPrimary },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs },
    meta: { flex: 1, fontSize: theme.typography.size.sm, color: theme.colors.textSecondary },
    score: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: theme.colors.successSoft,
      borderRadius: theme.radius.md,
      padding: theme.spacing.md,
    },
    scoreLabel: {
      fontSize: theme.typography.size.sm,
      color: theme.colors.successText,
      fontWeight: theme.typography.weight.medium,
    },
    scoreValue: {
      fontSize: theme.typography.size.lg,
      fontWeight: theme.typography.weight.bold,
      color: theme.colors.successText,
    },

    overlay: {
      flex: 1,
      backgroundColor: theme.colors.overlay,
      justifyContent: 'center',
      padding: theme.spacing.lg,
    },
    modal: { gap: theme.spacing.md },
    modalTitle: {
      fontSize: theme.typography.size.lg,
      fontWeight: theme.typography.weight.bold,
      color: theme.colors.textPrimary,
    },
    modalSubtitle: { fontSize: theme.typography.size.sm, color: theme.colors.textSecondary },
    section: { gap: theme.spacing.sm },
    label: {
      fontSize: theme.typography.size.sm,
      fontWeight: theme.typography.weight.medium,
      color: theme.colors.textSecondary,
    },
    choices: { flexDirection: 'row', gap: theme.spacing.md },
    choice: { flex: 1 },
    notes: { minHeight: 72 },
    actions: { flexDirection: 'row', gap: theme.spacing.md },
    action: { flex: 1 },
  });
