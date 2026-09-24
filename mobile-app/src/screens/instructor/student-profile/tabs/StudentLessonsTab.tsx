/**
 * Onglet « Leçons » de la fiche élève (11.4) — P3 et encaissement P6.
 * Une absence n'est pas facturable (D-41, P6 la refuse) ; l'avoir imputé est affiché (D-40).
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Alert, FlatList, Modal, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { studentProfileService } from '../../../../services/api/StudentProfileService';
import { getApiErrorMessage } from '../../../../services/api/ApiError';
import {
  LessonHistory,
  paymentMethodLabel,
  PAYMENT_METHODS,
  PaymentMethod,
} from '../../../../models/Profile';
import { lessonTypeLabel, LessonType } from '../../../../models/Lesson';
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

/** Type de leçon → intention de couleur : le thème décide du rendu. */
const typeTone = (type: LessonType): Tone => {
  switch (type) {
    case LessonType.CODE:
      return 'accent';
    case LessonType.MANOEUVRE:
      return 'warning';
    case LessonType.PARC:
      return 'success';
    default:
      return 'neutral';
  }
};

export const StudentLessonsTab = ({ route }: any) => {
  const { t } = useI18n();
  const { showToast } = useToast();
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { studentId, schoolId } = route.params;
  const currency = useSchoolCurrency(schoolId);

  const [loading, setLoading] = useState(true);
  const [lessons, setLessons] = useState<LessonHistory[]>([]);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedLesson, setSelectedLesson] = useState<LessonHistory | null>(null);
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    loadLessons();
  }, []);

  const loadLessons = async () => {
    try {
      setLoading(true);
      const data = await studentProfileService.getStudentLessons(studentId, schoolId);
      setLessons(data);
    } catch (error) {
      Alert.alert(t('common.error'), getApiErrorMessage(error, t('myLessons.loadFailed')));
    } finally {
      setLoading(false);
    }
  };

  const handleMarkPaid = (lesson: LessonHistory) => {
    setSelectedLesson(lesson);
    // Montant proposé : celui déjà saisi, sinon le prix figé sur la leçon (D-30)
    setAmount((lesson.amount ?? lesson.price)?.toString() || '');
    setShowPaymentModal(true);
  };

  const confirmPayment = async () => {
    if (!selectedLesson || !amount || parseFloat(amount) <= 0) {
      Alert.alert(t('studentLessons.invalidAmount'), t('studentLessons.invalidAmountText'));
      return;
    }

    try {
      setProcessing(true);
      await studentProfileService.markLessonPaid(
        selectedLesson.id,
        parseFloat(amount),
        paymentMethod
      );
      showToast(t('studentLessons.markedPaid'));
      setShowPaymentModal(false);
      setSelectedLesson(null);
      setAmount('');
      loadLessons();
    } catch (error) {
      Alert.alert(t('common.error'), getApiErrorMessage(error, t('studentLessons.markPaidFailed')));
    } finally {
      setProcessing(false);
    }
  };

  const renderLesson = ({ item }: { item: LessonHistory }) => {
    const instructor = `${item.instructorFirstName} ${item.instructorLastName}`.trim();

    return (
      <Card style={styles.card}>
        <View style={styles.head}>
          <Badge
            label={`${lessonTypeLabel(item.type) ?? item.type}${
              item.status === 'cancelled' ? t('common.cancelledSuffix') : ''
            }`}
            tone={typeTone(item.type)}
          />
          <Badge
            label={item.paid ? t('myLessons.paid') : t('myLessons.unpaid')}
            tone={item.paid ? 'success' : 'warning'}
            dot
          />
        </View>

        <View style={styles.details}>
          <View style={styles.metaRow}>
            <Ionicons name="calendar-outline" size={16} color={theme.colors.textMuted} />
            <Text style={styles.meta}>{formatDateTime(item.scheduledDate)}</Text>
          </View>
          <View style={styles.metaRow}>
            <Ionicons name="person-outline" size={16} color={theme.colors.textMuted} />
            <Text style={styles.meta}>{instructor || t('format.empty')}</Text>
          </View>
          <View style={styles.metaRow}>
            <Ionicons name="time-outline" size={16} color={theme.colors.textMuted} />
            <Text style={styles.meta}>
              {item.durationMinutes
                ? t('format.minutes', { count: item.durationMinutes })
                : t('format.empty')}
            </Text>
          </View>

          {item.attended !== null && item.attended !== undefined ? (
            <View style={styles.metaRow}>
              <Ionicons
                name={item.attended ? 'checkmark-circle-outline' : 'close-circle-outline'}
                size={16}
                color={item.attended ? theme.colors.successText : theme.colors.dangerText}
              />
              <Text
                style={[
                  styles.meta,
                  { color: item.attended ? theme.colors.successText : theme.colors.dangerText },
                ]}
              >
                {item.attended ? t('studentLessons.attended') : t('studentLessons.absentNotBilled')}
              </Text>
            </View>
          ) : null}

          {item.amount !== null || item.price !== null ? (
            <View style={styles.metaRow}>
              <Ionicons name="cash-outline" size={16} color={theme.colors.textMuted} />
              <Text style={styles.meta}>{formatAmount(item.amount ?? item.price, currency)}</Text>
            </View>
          ) : null}
        </View>

        {item.feedback ? (
          <View style={styles.quote}>
            <Text style={styles.quoteLabel}>{t('profile.feedback')}</Text>
            <Text style={styles.quoteText}>{item.feedback}</Text>
          </View>
        ) : null}

        {item.rating ? (
          <View style={styles.rating}>
            {[1, 2, 3, 4, 5].map((star) => (
              <Ionicons
                key={star}
                name={star <= item.rating! ? 'star' : 'star-outline'}
                size={16}
                color={theme.colors.warning}
              />
            ))}
          </View>
        ) : null}

        {/* D-41 : une absence n'est pas facturable (P6 la refuse) */}
        {!item.paid && item.attended !== false ? (
          <Button
            title={t('studentLessons.markPaid')}
            onPress={() => handleMarkPaid(item)}
            size="sm"
            icon="checkmark-circle-outline"
          />
        ) : null}

        {item.attended === false && (item.paid || item.creditApplied > 0) ? (
          <Text style={styles.note}>{t('studentLessons.refundedAsCredit')}</Text>
        ) : null}

        {item.paid && item.paymentDate ? (
          <Text style={styles.note}>
            {t('studentLessons.paidOnVia', {
              date: formatDate(item.paymentDate),
              method: paymentMethodLabel(item.paymentMethod),
            })}
          </Text>
        ) : null}

        {item.creditApplied > 0 ? (
          <Text style={styles.note}>
            {t('studentLessons.creditApplied', {
              credit: formatAmount(item.creditApplied, currency),
            })}
            {!item.paid && item.amount !== null
              ? t('studentLessons.creditRemaining', {
                  remaining: formatAmount(item.amount, currency),
                })
              : ''}
          </Text>
        ) : null}
      </Card>
    );
  };

  if (loading) {
    return (
      <View style={styles.skeletons}>
        <SkeletonCard lines={4} />
        <SkeletonCard lines={4} />
      </View>
    );
  }

  return (
    <View style={styles.flex}>
      <FlatList
        data={lessons}
        renderItem={renderLesson}
        keyExtractor={(item) => item.id}
        contentContainerStyle={lessons.length === 0 ? styles.emptyList : styles.listContent}
        ListEmptyComponent={
          <EmptyState
            icon="car-outline"
            title={t('studentLessons.emptyTitle')}
            message={t('studentLessons.emptyText')}
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
            <Text style={styles.modalTitle}>{t('studentLessons.modalTitle')}</Text>

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
    details: { gap: theme.spacing.xs },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
    meta: { flex: 1, fontSize: theme.typography.size.sm, color: theme.colors.textSecondary },
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
    rating: { flexDirection: 'row', gap: 2 },
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
