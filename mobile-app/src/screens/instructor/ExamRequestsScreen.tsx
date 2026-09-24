/**
 * Demandes d'examen (11.4) — X1 `pending`, planification X3, refus X4.
 *
 * Pas d'instructeur attitré (D-33) : tout instructeur de l'école voit et traite les demandes.
 * Pas de règle d'éligibilité (D-26) : le nombre de leçons effectuées est affiché pour aider à
 * décider. Les libellés dépendent du type (D-42, `examProcedure`) : théorie planifiée par
 * l'école, pratique convoquée par la session ATTT ; mêmes payloads X3 / X4.
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { examService } from '../../services/api/ExamService';
import { getApiErrorMessage } from '../../services/api/ApiError';
import { useI18n } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
import { AppBar, Button, Card, EmptyState, Field, SkeletonCard } from '../../components/ui';
import { examProcedure, examTypeLabel, Exam, ExamStatus, ExamType } from '../../models/Exam';
import { dateLocale, formatDate, formatPersonName } from '../../utils/format';
import { Theme } from '../../theme';

/** Motif de refus : 10 à 500 caractères, même règle que le backend. */
const REASON_MIN = 10;
const REASON_MAX = 500;

/** Demain à 9 h : proposé quand la demande n'a pas de date souhaitée. */
const tomorrowMorning = (): Date => {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  date.setHours(9, 0, 0, 0);
  return date;
};

/**
 * Créneau proposé au départ : la date souhaitée si elle est encore à venir, sinon la même
 * heure au prochain jour futur — une date passée serait refusée (400) et bloquerait l'écran.
 */
const firstFutureSlot = (wanted: string | null | undefined, now: Date = new Date()): Date => {
  if (!wanted) return tomorrowMorning();
  const date = new Date(wanted);
  if (Number.isNaN(date.getTime())) return tomorrowMorning();
  while (date.getTime() <= now.getTime()) {
    date.setDate(date.getDate() + 1);
  }
  return date;
};

export const ExamRequestsScreen = ({ navigation }: any) => {
  const { t } = useI18n();
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [requests, setRequests] = useState<Exam[]>([]);
  const [processing, setProcessing] = useState(false);

  // Planification (X3)
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<Exam | null>(null);
  const [dateTime, setDateTime] = useState<Date>(tomorrowMorning);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [location, setLocation] = useState('');

  // Refus (X4)
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  const studentOf = (exam: Exam) =>
    formatPersonName(
      { firstName: exam.studentFirstName, lastName: exam.studentLastName },
      t('today.student')
    );

  // Onglet (8.4) : rechargé à chaque retour au premier plan
  useFocusEffect(
    useCallback(() => {
      loadRequests();
    }, [])
  );

  const loadRequests = async () => {
    try {
      setLoading(true);
      // X1 : toutes les demandes pending de l'école (instructeur)
      const data = await examService.getMyExams({ status: [ExamStatus.PENDING] });
      setRequests(data);
    } catch (error) {
      Alert.alert(t('common.error'), getApiErrorMessage(error, t('examRequests.loadFailed')));
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadRequests();
    setRefreshing(false);
  }, []);

  // ----- Planification (X3) -----

  const openSchedule = (request: Exam) => {
    setSelectedRequest(request);
    setDateTime(firstFutureSlot(request.preferredDate));
    setLocation('');
    setShowScheduleModal(true);
  };

  const closeSchedule = () => {
    setShowScheduleModal(false);
    setLocation('');
    setSelectedRequest(null);
  };

  const handleDateChange = (_event: unknown, selected?: Date) => {
    setShowDatePicker(false);
    if (selected) {
      const next = new Date(dateTime);
      next.setFullYear(selected.getFullYear(), selected.getMonth(), selected.getDate());
      setDateTime(next);
    }
  };

  const handleTimeChange = (_event: unknown, selected?: Date) => {
    setShowTimePicker(false);
    if (selected) {
      const next = new Date(dateTime);
      next.setHours(selected.getHours(), selected.getMinutes(), 0, 0);
      setDateTime(next);
    }
  };

  const confirmSchedule = async () => {
    if (!selectedRequest) return;
    if (!location.trim()) {
      Alert.alert(t('common.required'), t('examRequests.locationRequired'));
      return;
    }
    if (dateTime.getTime() <= Date.now()) {
      Alert.alert(t('lessonRequests.invalidDate'), t('examRequests.dateMustBeFuture'));
      return;
    }

    try {
      setProcessing(true);
      // X3 : date et centre → scheduled
      await examService.scheduleExam(selectedRequest.id, {
        dateTime: dateTime.toISOString(),
        location: location.trim(),
      });
      // Confirmation dans les mots de la procédure du type (D-42)
      Alert.alert(
        t('common.success'),
        selectedRequest.type === ExamType.PRACTICAL
          ? t('examRequests.convocationRecorded')
          : t('examRequests.examScheduled')
      );
      closeSchedule();
      loadRequests();
    } catch (error) {
      // 409 : un collègue a déjà traité la demande
      Alert.alert(t('common.error'), getApiErrorMessage(error, t('examRequests.scheduleFailed')));
      loadRequests();
    } finally {
      setProcessing(false);
    }
  };

  // ----- Refus (X4) -----

  const openReject = (request: Exam) => {
    setSelectedRequest(request);
    setRejectionReason('');
    setShowRejectModal(true);
  };

  const closeReject = () => {
    setShowRejectModal(false);
    setRejectionReason('');
    setSelectedRequest(null);
  };

  const reasonLength = rejectionReason.trim().length;
  const reasonValid = reasonLength >= REASON_MIN && reasonLength <= REASON_MAX;

  const confirmReject = async () => {
    if (!selectedRequest) return;
    if (!reasonValid) {
      Alert.alert(
        t('lessonRequests.reasonTooShort'),
        t('lessonRequests.reasonTooShortText', { min: REASON_MIN })
      );
      return;
    }

    try {
      setProcessing(true);
      await examService.rejectExamRequest(selectedRequest.id, rejectionReason.trim());
      Alert.alert(
        t('common.success'),
        selectedRequest.type === ExamType.PRACTICAL
          ? t('examRequests.fileNotReadyDone')
          : t('examRequests.rejectedDone')
      );
      closeReject();
      loadRequests();
    } catch (error) {
      Alert.alert(t('common.error'), getApiErrorMessage(error, t('examRequests.rejectFailed')));
      loadRequests();
    } finally {
      setProcessing(false);
    }
  };

  // ----- Rendu -----

  const renderRequestCard = ({ item }: { item: Exam }) => {
    const procedure = examProcedure(item.type);
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
              <Ionicons name="school-outline" size={15} color={theme.colors.textMuted} />
              <Text style={styles.meta}>
                {t('examRequests.lessonsCompleted', { count: item.studentCompletedLessons })}
              </Text>
            </View>
            <View style={styles.metaRow}>
              <Ionicons name="calendar-outline" size={15} color={theme.colors.textMuted} />
              <Text style={styles.meta}>
                {t('examRequests.preferred', {
                  date: formatDate(item.preferredDate, t('lessonRequests.noDateGiven')),
                })}
              </Text>
            </View>
            {item.message ? (
              <View style={styles.quote}>
                <Text style={styles.quoteText}>{item.message}</Text>
              </View>
            ) : null}
          </View>
        </View>

        <View style={styles.actions}>
          <Button
            title={procedure.rejectAction}
            onPress={() => openReject(item)}
            variant="secondary"
            size="sm"
            icon="close"
            disabled={processing}
            style={styles.action}
          />
          <Button
            title={procedure.scheduleAction}
            onPress={() => openSchedule(item)}
            size="sm"
            icon="calendar-outline"
            disabled={processing}
            style={styles.action}
          />
        </View>
      </Card>
    );
  };

  // Libellés de la modale ouverte : ceux du type de la demande sélectionnée (D-42)
  const selectedProcedure = examProcedure(selectedRequest?.type ?? ExamType.THEORY);

  return (
    <View style={styles.flex}>
      <AppBar title={t('examRequests.title')} large />

      {loading && requests.length === 0 ? (
        <View style={styles.skeletons}>
          <SkeletonCard lines={4} />
          <SkeletonCard lines={4} />
        </View>
      ) : (
        <FlatList
          data={requests}
          renderItem={renderRequestCard}
          keyExtractor={(item) => item.id}
          contentContainerStyle={requests.length === 0 ? styles.emptyList : styles.listContent}
          ListEmptyComponent={
            <EmptyState
              icon="checkmark-done-outline"
              title={t('examRequests.emptyTitle')}
              message={t('examRequests.emptyText')}
              tone="success"
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

      {/* Planification (X3) */}
      <Modal
        visible={showScheduleModal}
        transparent
        animationType="fade"
        onRequestClose={closeSchedule}
      >
        <View style={styles.overlay}>
          <Card style={styles.modal}>
            <Text style={styles.modalTitle}>{selectedProcedure.scheduleAction}</Text>

            <Text style={styles.modalSubtitle}>
              {selectedRequest
                ? t('examRequests.modalSubtitle', {
                    type: examTypeLabel(selectedRequest.type),
                    student: studentOf(selectedRequest),
                    hint: selectedProcedure.scheduleHint,
                  })
                : ''}
            </Text>

            <View style={styles.section}>
              <Text style={styles.label}>{selectedProcedure.dateLabel}</Text>
              <View style={styles.dateRow}>
                <Pressable
                  onPress={() => setShowDatePicker(true)}
                  accessibilityRole="button"
                  style={({ pressed }) => [
                    styles.dateButton,
                    styles.grow,
                    pressed && styles.pressed,
                  ]}
                >
                  <Ionicons name="calendar-outline" size={20} color={theme.colors.textSecondary} />
                  <Text style={styles.dateText}>{dateTime.toLocaleDateString(dateLocale())}</Text>
                </Pressable>
                <Pressable
                  onPress={() => setShowTimePicker(true)}
                  accessibilityRole="button"
                  style={({ pressed }) => [styles.dateButton, pressed && styles.pressed]}
                >
                  <Ionicons name="time-outline" size={20} color={theme.colors.textSecondary} />
                  <Text style={styles.dateText}>
                    {dateTime.toLocaleTimeString(dateLocale(), {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Text>
                </Pressable>
              </View>
              {showDatePicker && (
                <DateTimePicker
                  value={dateTime}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onValueChange={handleDateChange}
                  onDismiss={() => setShowDatePicker(false)}
                  minimumDate={new Date()}
                />
              )}
              {showTimePicker && (
                <DateTimePicker
                  value={dateTime}
                  mode="time"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onValueChange={handleTimeChange}
                  onDismiss={() => setShowTimePicker(false)}
                />
              )}
            </View>

            <Field
              label={selectedProcedure.locationLabel}
              placeholder={selectedProcedure.locationPlaceholder}
              value={location}
              onChangeText={setLocation}
              icon="location-outline"
            />

            <View style={styles.modalActions}>
              <Button
                title={t('common.cancel')}
                onPress={closeSchedule}
                variant="secondary"
                style={styles.action}
              />
              <Button
                title={selectedProcedure.scheduleAction}
                onPress={confirmSchedule}
                loading={processing}
                style={styles.action}
              />
            </View>
          </Card>
        </View>
      </Modal>

      {/* Refus (X4) */}
      <Modal
        visible={showRejectModal}
        transparent
        animationType="fade"
        onRequestClose={closeReject}
      >
        <View style={styles.overlay}>
          <Card style={styles.modal}>
            <Text style={styles.modalTitle}>{selectedProcedure.rejectAction}</Text>
            <Text style={styles.modalSubtitle}>{selectedProcedure.rejectHint}</Text>

            <Field
              label={selectedProcedure.rejectAction}
              placeholder={t('examRequests.rejectPlaceholder')}
              hint={
                reasonLength < REASON_MIN
                  ? t('reason.min', { min: REASON_MIN, count: reasonLength })
                  : t('reason.count', { count: reasonLength, max: REASON_MAX })
              }
              value={rejectionReason}
              onChangeText={setRejectionReason}
              multiline
              numberOfLines={4}
              maxLength={REASON_MAX}
              textAlignVertical="top"
              style={styles.textarea}
            />

            <View style={styles.modalActions}>
              <Button
                title={t('common.cancel')}
                onPress={closeReject}
                variant="secondary"
                style={styles.action}
              />
              <Button
                title={selectedProcedure.rejectAction}
                onPress={confirmReject}
                variant="danger"
                loading={processing}
                disabled={!reasonValid}
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
    quote: {
      marginTop: theme.spacing.xs,
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: theme.radius.md,
      padding: theme.spacing.md,
    },
    quoteText: { fontSize: theme.typography.size.sm, color: theme.colors.textSecondary },
    actions: { flexDirection: 'row', gap: theme.spacing.md },
    action: { flex: 1 },

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
    dateRow: { flexDirection: 'row', gap: theme.spacing.md },
    dateButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
      backgroundColor: theme.colors.surfaceRaised,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.radius.md,
      paddingHorizontal: theme.spacing.base,
      paddingVertical: theme.spacing.md,
    },
    grow: { flex: 1 },
    pressed: { opacity: 0.7 },
    dateText: { fontSize: theme.typography.size.base, color: theme.colors.textPrimary },
    textarea: { minHeight: 80 },
    modalActions: { flexDirection: 'row', gap: theme.spacing.md },
  });
