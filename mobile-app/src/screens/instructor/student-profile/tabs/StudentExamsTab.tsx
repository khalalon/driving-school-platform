/**
 * Onglet « Examens » de la fiche élève (11.4) — P4 et encaissement P7.
 * Les libellés de résultat viennent du modèle (D-18, D-42) ; la devise est celle de l'école (D-43).
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Alert, FlatList, Modal, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { studentProfileService } from '../../../../services/api/StudentProfileService';
import { getApiErrorMessage } from '../../../../services/api/ApiError';
import {
  ExamHistory,
  paymentMethodLabel,
  PAYMENT_METHODS,
  PaymentMethod,
} from '../../../../models/Profile';
import { examResultLabel, examTypeLabel, ExamResult, ExamType } from '../../../../models/Exam';
import { useSchoolCurrency } from '../../../../hooks/useSchoolCurrency';
import { formatAmount, formatDate, formatDateTime } from '../../../../utils/format';
import { useI18n } from '../../../../context/LanguageContext';
import { useToast } from '../../../../context/ToastContext';
import { useTheme } from '../../../../context/ThemeContext';
import {
  Badge,
  Button,
  Card,
  Chip,
  EmptyState,
  Field,
  SkeletonCard,
  Tone,
} from '../../../../components/ui';
import { Theme } from '../../../../theme';
import { IoniconName } from '../../../../utils/rtl';

const resultTone = (result: string): Tone => {
  switch (result) {
    case ExamResult.PASSED:
      return 'success';
    case ExamResult.FAILED:
      return 'danger';
    default:
      return 'warning';
  }
};

const resultIcon = (result: string): IoniconName => {
  switch (result) {
    case ExamResult.PASSED:
      return 'checkmark-circle';
    case ExamResult.FAILED:
      return 'close-circle';
    default:
      return 'time-outline';
  }
};

export const StudentExamsTab = ({ route }: any) => {
  const { t } = useI18n();
  const { showToast } = useToast();
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { studentId, schoolId } = route.params;
  const currency = useSchoolCurrency(schoolId);

  const [loading, setLoading] = useState(true);
  const [exams, setExams] = useState<ExamHistory[]>([]);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedExam, setSelectedExam] = useState<ExamHistory | null>(null);
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    loadExams();
  }, []);

  const loadExams = async () => {
    try {
      setLoading(true);
      const data = await studentProfileService.getStudentExams(studentId, schoolId);
      setExams(data);
    } catch (error) {
      Alert.alert(t('common.error'), getApiErrorMessage(error, t('myExams.loadFailed')));
    } finally {
      setLoading(false);
    }
  };

  const handleMarkPaid = (exam: ExamHistory) => {
    setSelectedExam(exam);
    setAmount((exam.amount ?? exam.price)?.toString() || '');
    setShowPaymentModal(true);
  };

  const confirmPayment = async () => {
    if (!selectedExam || !amount || parseFloat(amount) <= 0) {
      Alert.alert(t('studentLessons.invalidAmount'), t('studentLessons.invalidAmountText'));
      return;
    }

    try {
      setProcessing(true);
      await studentProfileService.markExamPaid(selectedExam.id, parseFloat(amount), paymentMethod);
      showToast(t('studentExams.markedPaid'));
      setShowPaymentModal(false);
      setSelectedExam(null);
      setAmount('');
      loadExams();
    } catch (error) {
      Alert.alert(t('common.error'), getApiErrorMessage(error, t('studentLessons.markPaidFailed')));
    } finally {
      setProcessing(false);
    }
  };

  const renderExam = ({ item }: { item: ExamHistory }) => {
    const tone = resultTone(item.result);
    const resultColor =
      tone === 'success'
        ? theme.colors.successText
        : tone === 'danger'
          ? theme.colors.dangerText
          : theme.colors.warningText;

    return (
      <Card style={styles.card}>
        <View style={styles.head}>
          <View style={styles.typeRow}>
            <Ionicons
              name={item.type === ExamType.THEORY ? 'book-outline' : 'car-outline'}
              size={20}
              color={theme.colors.signalText}
            />
            <Text style={styles.type}>
              {t('myExams.examSuffix', { type: examTypeLabel(item.type as ExamType) })}
              {item.status === 'cancelled' ? t('common.cancelledSuffix') : ''}
            </Text>
          </View>
          <Badge
            label={item.paid ? t('myLessons.paid') : t('myLessons.unpaid')}
            tone={item.paid ? 'success' : 'warning'}
            dot
          />
        </View>

        <View style={styles.details}>
          <View style={styles.metaRow}>
            <Ionicons name="calendar-outline" size={16} color={theme.colors.textMuted} />
            <Text style={styles.meta}>
              {formatDateTime(item.dateTime)}
              {item.location ? ` · ${item.location}` : ''}
            </Text>
          </View>

          {item.result !== ExamResult.PENDING ? (
            <View style={styles.metaRow}>
              <Ionicons name={resultIcon(item.result)} size={20} color={resultColor} />
              <Text style={[styles.result, { color: resultColor }]}>
                {examResultLabel(item.result as ExamResult) ?? item.result}
              </Text>
              {item.score !== null && item.score !== undefined ? (
                <Text style={styles.meta}>
                  {t('studentExams.scoreOutOf', { score: item.score })}
                </Text>
              ) : null}
            </View>
          ) : null}

          {item.amount !== null || item.price !== null ? (
            <View style={styles.metaRow}>
              <Ionicons name="cash-outline" size={16} color={theme.colors.textMuted} />
              <Text style={styles.meta}>{formatAmount(item.amount ?? item.price, currency)}</Text>
            </View>
          ) : null}
        </View>

        {item.notes ? (
          <View style={styles.quote}>
            <Text style={styles.quoteLabel}>{t('profile.notes')}</Text>
            <Text style={styles.quoteText}>{item.notes}</Text>
          </View>
        ) : null}

        {!item.paid ? (
          <Button
            title={t('studentLessons.markPaid')}
            onPress={() => handleMarkPaid(item)}
            size="sm"
            icon="checkmark-circle-outline"
          />
        ) : null}

        {item.paid && item.paymentDate ? (
          <Text style={styles.note}>
            {t('studentLessons.paidOnVia', {
              date: formatDate(item.paymentDate),
              method: paymentMethodLabel(item.paymentMethod),
            })}
          </Text>
        ) : null}
      </Card>
    );
  };

  if (loading) {
    return (
      <View style={styles.skeletons}>
        <SkeletonCard lines={3} />
        <SkeletonCard lines={3} />
      </View>
    );
  }

  return (
    <View style={styles.flex}>
      <FlatList
        data={exams}
        renderItem={renderExam}
        keyExtractor={(item) => item.id}
        contentContainerStyle={exams.length === 0 ? styles.emptyList : styles.listContent}
        ListEmptyComponent={
          <EmptyState
            icon="ribbon-outline"
            title={t('studentExams.emptyTitle')}
            message={t('studentExams.emptyText')}
            tone="neutral"
          />
        }
        showsVerticalScrollIndicator={false}
      />

      <Modal
        visible={showPaymentModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPaymentModal(false)}
      >
        <View style={styles.overlay}>
          <Card style={styles.modal}>
            <Text style={styles.modalTitle}>{t('studentExams.modalTitle')}</Text>

            <Field
              label={`${t('studentLessons.amount')}${currency ? ` (${currency})` : ''}`}
              placeholder="0.00"
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
              icon="cash-outline"
            />

            <View style={styles.section}>
              <Text style={styles.label}>{t('studentLessons.paymentMethod')}</Text>
              <View style={styles.methods}>
                {PAYMENT_METHODS.map((method) => (
                  <Chip
                    key={method}
                    label={paymentMethodLabel(method)}
                    selected={paymentMethod === method}
                    onPress={() => setPaymentMethod(method)}
                  />
                ))}
              </View>
            </View>

            <View style={styles.modalActions}>
              <Button
                title={t('common.cancel')}
                onPress={() => setShowPaymentModal(false)}
                variant="secondary"
                style={styles.action}
              />
              <Button
                title={t('studentLessons.confirmPayment')}
                onPress={confirmPayment}
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
    skeletons: {
      flex: 1,
      backgroundColor: theme.colors.surface,
      padding: theme.spacing.base,
      gap: theme.spacing.md,
    },
    listContent: { padding: theme.spacing.base, gap: theme.spacing.md },
    emptyList: { flexGrow: 1, justifyContent: 'center' },
    card: { gap: theme.spacing.sm },
    head: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: theme.spacing.sm,
    },
    typeRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, flex: 1 },
    type: {
      flex: 1,
      fontSize: theme.typography.size.base,
      fontWeight: theme.typography.weight.semibold,
      color: theme.colors.textPrimary,
    },
    details: { gap: theme.spacing.xs },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
    meta: { fontSize: theme.typography.size.sm, color: theme.colors.textSecondary },
    result: { fontSize: theme.typography.size.base, fontWeight: theme.typography.weight.semibold },
    quote: {
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: theme.radius.md,
      padding: theme.spacing.md,
      gap: theme.spacing.xs,
    },
    quoteLabel: {
      fontSize: theme.typography.size.xs,
      fontWeight: theme.typography.weight.medium,
      color: theme.colors.textMuted,
    },
    quoteText: { fontSize: theme.typography.size.sm, color: theme.colors.textPrimary },
    note: { fontSize: theme.typography.size.xs, color: theme.colors.textSecondary },

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
    section: { gap: theme.spacing.sm },
    label: {
      fontSize: theme.typography.size.sm,
      fontWeight: theme.typography.weight.medium,
      color: theme.colors.textSecondary,
    },
    methods: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm },
    modalActions: { flexDirection: 'row', gap: theme.spacing.md },
    action: { flex: 1 },
  });
