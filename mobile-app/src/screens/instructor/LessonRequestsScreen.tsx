/**
 * Demandes de leçon (11.4) — L1 `scope=school`, L5, L6.
 *
 * File partagée (D-32) : toutes les demandes `pending` de l'école ; l'instructeur qui approuve
 * devient l'instructeur de la leçon, en fixant la date et la durée. Le prix vient de la grille
 * de l'école (S4) ; il n'est saisi que si l'école n'a pas de tarif pour ce type (D-30).
 * Approbation multiple (D-34) : les demandes de code se cochent et se planifient d'un coup pour
 * un même créneau — un seul formulaire, puis un appel L5 par demande, avec récapitulatif.
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useAuth } from '../../context/AuthContext';
import { useI18n } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
import { AppBar, Button, Card, EmptyState, Field, SkeletonCard } from '../../components/ui';
import { lessonService } from '../../services/api/LessonService';
import { schoolService } from '../../services/api/SchoolService';
import { getApiErrorMessage } from '../../services/api/ApiError';
import { lessonTypeLabel, Lesson, LessonStatus, LessonType } from '../../models/Lesson';
import { SchoolInstructor, SchoolPricing } from '../../models/School';
import { useSchoolCurrency } from '../../hooks/useSchoolCurrency';
import { dateLocale, formatAmount, formatDateTime, formatPersonName } from '../../utils/format';
import { Theme } from '../../theme';

/** Motif de refus : 10 à 500 caractères, même règle que le backend (D-29). */
const REASON_MIN = 10;
const REASON_MAX = 500;
const DEFAULT_DURATION_MINUTES = 60;

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

export const LessonRequestsScreen = ({ navigation }: any) => {
  const { t } = useI18n();
  const { user } = useAuth();
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const schoolId = user?.schoolId;
  const currency = useSchoolCurrency(schoolId);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [requests, setRequests] = useState<Lesson[]>([]);
  const [processing, setProcessing] = useState(false);

  // Référentiel de l'école : noms des instructeurs (préférence affichée) et grille tarifaire.
  // `pricing` reste `null` tant que la grille n'a pas pu être lue (le prix est alors facultatif).
  const [instructors, setInstructors] = useState<SchoolInstructor[]>([]);
  const [pricing, setPricing] = useState<SchoolPricing[] | null>(null);

  // Approbation : une demande, ou plusieurs demandes de code pour le même créneau (D-34)
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [approveTargets, setApproveTargets] = useState<Lesson[]>([]);
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const [scheduledDate, setScheduledDate] = useState<Date>(tomorrowMorning);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [duration, setDuration] = useState(String(DEFAULT_DURATION_MINUTES));
  const [price, setPrice] = useState('');
  const [adminNotes, setAdminNotes] = useState('');

  // Refus
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<Lesson | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  // Onglet (8.4) : rechargé à chaque retour au premier plan
  useFocusEffect(
    useCallback(() => {
      loadRequests();
      loadSchoolData();
    }, [schoolId])
  );

  const loadRequests = async () => {
    try {
      setLoading(true);
      // L1 : file partagée des demandes pending de l'école
      const data = await lessonService.getMyLessons({
        status: [LessonStatus.PENDING],
        scope: 'school',
      });
      setRequests(data);
      // Une demande traitée entre-temps ne reste pas cochée
      setCheckedIds((previous) => new Set(data.filter((l) => previous.has(l.id)).map((l) => l.id)));
    } catch (error) {
      Alert.alert(t('common.error'), getApiErrorMessage(error, t('lessonRequests.loadFailed')));
    } finally {
      setLoading(false);
    }
  };

  const loadSchoolData = async () => {
    if (!schoolId) return;
    try {
      const [instructorList, pricingList] = await Promise.all([
        schoolService.getSchoolInstructors(schoolId),
        schoolService.getSchoolPricing(schoolId),
      ]);
      setInstructors(instructorList);
      setPricing(pricingList);
    } catch {
      // Sans référentiel : la préférence est affichée sans nom, le prix reste facultatif
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([loadRequests(), loadSchoolData()]);
    setRefreshing(false);
  }, [schoolId]);

  const preferredInstructorLabel = (request: Lesson): string | null => {
    if (!request.preferredInstructorId) return null;
    if (request.preferredInstructorId === user?.instructorId) return t('lessonRequests.you');
    const instructor = instructors.find((i) => i.id === request.preferredInstructorId);
    return instructor
      ? formatPersonName(instructor, t('lessonRequests.anInstructor'))
      : t('lessonRequests.anInstructor');
  };

  const pricingFor = (type: LessonType | undefined): SchoolPricing | undefined =>
    type && pricing ? pricing.find((p) => p.lessonType === type) : undefined;

  // ----- Sélection multiple (D-34 : demandes de code seulement) -----

  const toggleChecked = (request: Lesson) => {
    setCheckedIds((previous) => {
      const next = new Set(previous);
      if (next.has(request.id)) next.delete(request.id);
      else next.add(request.id);
      return next;
    });
  };

  const checkedRequests = requests.filter((r) => checkedIds.has(r.id));

  // ----- Approbation (L5, une demande ou un lot) -----

  const openApprove = (targets: Lesson[]) => {
    if (targets.length === 0) return;
    const rate = pricingFor(targets[0].type);
    setApproveTargets(targets);
    // Une seule demande : sa date souhaitée ; un lot : un créneau commun à choisir
    setScheduledDate(
      targets.length === 1 ? firstFutureSlot(targets[0].requestedDate) : tomorrowMorning()
    );
    setDuration(String(rate?.duration ?? DEFAULT_DURATION_MINUTES));
    setPrice('');
    setAdminNotes('');
    setShowApproveModal(true);
  };

  const closeApprove = () => {
    setShowApproveModal(false);
    setApproveTargets([]);
  };

  const handleDateChange = (_event: unknown, selected?: Date) => {
    setShowDatePicker(false);
    if (selected) {
      const next = new Date(scheduledDate);
      next.setFullYear(selected.getFullYear(), selected.getMonth(), selected.getDate());
      setScheduledDate(next);
    }
  };

  const handleTimeChange = (_event: unknown, selected?: Date) => {
    setShowTimePicker(false);
    if (selected) {
      const next = new Date(scheduledDate);
      next.setHours(selected.getHours(), selected.getMinutes(), 0, 0);
      setScheduledDate(next);
    }
  };

  const confirmApprove = async () => {
    if (approveTargets.length === 0) return;
    const targetType = approveTargets[0].type;
    const rate = pricingFor(targetType);
    const required = pricing !== null && !rate;

    if (scheduledDate.getTime() <= Date.now()) {
      Alert.alert(t('lessonRequests.invalidDate'), t('lessonRequests.dateMustBeFuture'));
      return;
    }
    const durationMinutes = Number.parseInt(duration, 10);
    if (!Number.isInteger(durationMinutes) || durationMinutes <= 0) {
      Alert.alert(t('lessonRequests.invalidDuration'), t('lessonRequests.durationText'));
      return;
    }
    const priceValue = price.trim() === '' ? undefined : Number(price.replace(',', '.'));
    if (priceValue !== undefined && (Number.isNaN(priceValue) || priceValue < 0)) {
      Alert.alert(t('lessonRequests.invalidPrice'), t('lessonRequests.priceText'));
      return;
    }
    if (required && priceValue === undefined) {
      Alert.alert(
        t('lessonRequests.priceRequired'),
        t('lessonRequests.priceRequiredText', { type: lessonTypeLabel(targetType) })
      );
      return;
    }

    const data = {
      scheduledDate: scheduledDate.toISOString(),
      durationMinutes,
      price: priceValue,
      adminNotes: adminNotes.trim() || undefined,
    };

    try {
      setProcessing(true);
      if (approveTargets.length === 1) {
        // L5 : l'appelant devient l'instructeur ; prix de la grille sinon celui saisi (D-30)
        await lessonService.approveLesson(approveTargets[0].id, data);
        Alert.alert(t('common.success'), t('lessonRequests.scheduled'));
      } else {
        // D-34 : un appel L5 par demande cochée, en séquence, puis récapitulatif
        const result = await lessonService.approveLessons(
          approveTargets.map((target) => target.id),
          data
        );
        const failures = result.failed.map(({ lessonId, error }) => {
          const request = approveTargets.find((target) => target.id === lessonId);
          const who = request ? formatPersonName(request.student, t('today.student')) : lessonId;
          return `• ${who}: ${getApiErrorMessage(error, t('lessonRequests.requestFailed'))}`;
        });
        Alert.alert(
          failures.length === 0 ? t('common.success') : t('lessonRequests.partiallyScheduled'),
          t('lessonRequests.batchResult', {
            done: result.succeeded.length,
            total: approveTargets.length,
          }) +
            (failures.length > 0
              ? `\n\n${t('lessonRequests.notScheduled')}\n${failures.join('\n')}`
              : '')
        );
        setCheckedIds(new Set());
      }
      closeApprove();
      loadRequests();
    } catch (error) {
      // 409 : un collègue a déjà traité la demande ; 400 PRICE_REQUIRED : grille incomplète
      Alert.alert(t('common.error'), getApiErrorMessage(error, t('lessonRequests.approveFailed')));
      loadRequests();
    } finally {
      setProcessing(false);
    }
  };

  // ----- Refus (L6) -----

  const openReject = (request: Lesson) => {
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
      await lessonService.rejectLesson(selectedRequest.id, rejectionReason.trim());
      Alert.alert(t('common.success'), t('lessonRequests.rejected'));
      closeReject();
      loadRequests();
    } catch (error) {
      Alert.alert(t('common.error'), getApiErrorMessage(error, t('lessonRequests.rejectFailed')));
      loadRequests();
    } finally {
      setProcessing(false);
    }
  };

  // ----- Rendu -----

  const renderRequestCard = ({ item }: { item: Lesson }) => {
    const preferred = preferredInstructorLabel(item);
    const rate = pricingFor(item.type);
    const selectable = item.type === LessonType.CODE;
    const checked = checkedIds.has(item.id);

    return (
      <Card highlighted={checked} style={styles.card}>
        <View style={styles.head}>
          {selectable ? (
            <Pressable
              onPress={() => toggleChecked(item)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked }}
              accessibilityLabel={t('lessonRequests.selectCode')}
              hitSlop={8}
              style={styles.checkbox}
            >
              <Ionicons
                name={checked ? 'checkbox' : 'square-outline'}
                size={26}
                color={checked ? theme.colors.accent : theme.colors.textMuted}
              />
            </Pressable>
          ) : (
            <View style={styles.avatar}>
              <Ionicons name="person" size={22} color={theme.colors.accentText} />
            </View>
          )}

          <View style={styles.info}>
            <Text style={styles.student}>{formatPersonName(item.student, t('today.student'))}</Text>
            <View style={styles.metaRow}>
              <Ionicons name="car-outline" size={15} color={theme.colors.textMuted} />
              <Text style={styles.meta}>
                {lessonTypeLabel(item.type) ?? item.type}
                {rate
                  ? ` · ${formatAmount(rate.price, currency)} · ${t('format.minutes', {
                      count: rate.duration,
                    })}`
                  : ''}
              </Text>
            </View>
            <View style={styles.metaRow}>
              <Ionicons name="calendar-outline" size={15} color={theme.colors.textMuted} />
              <Text style={styles.meta}>
                {t('lessonRequests.requestedOn', {
                  date: formatDateTime(item.requestedDate, t('lessonRequests.noDateGiven')),
                })}
              </Text>
            </View>
            {preferred ? (
              <View style={styles.metaRow}>
                <Ionicons name="star" size={15} color={theme.colors.warning} />
                <Text style={styles.preferred}>
                  {t('lessonRequests.prefers', { name: preferred })}
                </Text>
              </View>
            ) : null}
            {item.notes ? (
              <View style={styles.quote}>
                <Text style={styles.quoteText}>{item.notes}</Text>
              </View>
            ) : null}
          </View>
        </View>

        <View style={styles.actions}>
          <Button
            title={t('lessonRequests.reject')}
            onPress={() => openReject(item)}
            variant="secondary"
            size="sm"
            icon="close"
            disabled={processing}
            style={styles.action}
          />
          <Button
            title={t('lessonRequests.schedule')}
            onPress={() => openApprove([item])}
            size="sm"
            icon="checkmark"
            disabled={processing}
            style={styles.action}
          />
        </View>
      </Card>
    );
  };

  const targetType = approveTargets[0]?.type;
  const selectedRate = pricingFor(targetType);
  const priceRequired = pricing !== null && targetType !== undefined && !selectedRate;
  const isBatch = approveTargets.length > 1;

  return (
    <View style={styles.flex}>
      <AppBar title={t('lessonRequests.title')} large />

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
              title={t('lessonRequests.emptyTitle')}
              message={t('lessonRequests.emptyText')}
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

      {/* Barre d'approbation multiple (D-34) */}
      {checkedRequests.length > 0 ? (
        <View style={styles.batchBar}>
          <Text style={styles.batchText}>
            {checkedRequests.length === 1
              ? t('lessonRequests.selectedOne')
              : t('lessonRequests.selectedMany', { count: checkedRequests.length })}
          </Text>
          <Button
            title={t('lessonRequests.clear')}
            onPress={() => setCheckedIds(new Set())}
            variant="ghost"
            size="sm"
          />
          <Button
            title={t('lessonRequests.scheduleTogether')}
            onPress={() => openApprove(checkedRequests)}
            size="sm"
            icon="calendar-outline"
            disabled={processing}
          />
        </View>
      ) : null}

      {/* Planification (L5) */}
      <Modal
        visible={showApproveModal}
        transparent
        animationType="fade"
        onRequestClose={closeApprove}
      >
        <View style={styles.overlay}>
          <Card style={styles.modal}>
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.modalBody}
            >
              <Text style={styles.modalTitle}>
                {isBatch
                  ? t('lessonRequests.scheduleMany', { count: approveTargets.length })
                  : t('lessonRequests.scheduleOne')}
              </Text>

              <Text style={styles.modalSubtitle}>
                {isBatch
                  ? t('lessonRequests.batchSubtitle', {
                      type: lessonTypeLabel(LessonType.CODE),
                      students: approveTargets
                        .map((target) => formatPersonName(target.student, t('today.student')))
                        .join(', '),
                    })
                  : approveTargets[0]
                    ? t('lessonRequests.singleSubtitle', {
                        type: lessonTypeLabel(approveTargets[0].type),
                        student: formatPersonName(
                          approveTargets[0].student,
                          t('attendance.theStudent')
                        ),
                      })
                    : ''}
              </Text>

              <View style={styles.section}>
                <Text style={styles.label}>{t('lessonRequests.dateTime')}</Text>
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
                    <Ionicons
                      name="calendar-outline"
                      size={20}
                      color={theme.colors.textSecondary}
                    />
                    <Text style={styles.dateText}>
                      {scheduledDate.toLocaleDateString(dateLocale())}
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => setShowTimePicker(true)}
                    accessibilityRole="button"
                    style={({ pressed }) => [styles.dateButton, pressed && styles.pressed]}
                  >
                    <Ionicons name="time-outline" size={20} color={theme.colors.textSecondary} />
                    <Text style={styles.dateText}>
                      {scheduledDate.toLocaleTimeString(dateLocale(), {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </Text>
                  </Pressable>
                </View>
                {showDatePicker && (
                  <DateTimePicker
                    value={scheduledDate}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onValueChange={handleDateChange}
                    onDismiss={() => setShowDatePicker(false)}
                    minimumDate={new Date()}
                  />
                )}
                {showTimePicker && (
                  <DateTimePicker
                    value={scheduledDate}
                    mode="time"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onValueChange={handleTimeChange}
                    onDismiss={() => setShowTimePicker(false)}
                  />
                )}
              </View>

              <Field
                label={t('lessonRequests.duration')}
                value={duration}
                onChangeText={setDuration}
                keyboardType="number-pad"
                placeholder={String(DEFAULT_DURATION_MINUTES)}
              />

              {selectedRate ? (
                <View style={styles.section}>
                  <Text style={styles.label}>
                    {t('lessonRequests.priceLabel')}
                    {currency ? ` (${currency})` : ''}
                  </Text>
                  <Text style={styles.hint}>
                    {t('lessonRequests.schoolRate', {
                      price: formatAmount(selectedRate.price, currency),
                    })}
                  </Text>
                </View>
              ) : (
                <Field
                  label={`${t('lessonRequests.priceLabel')}${currency ? ` (${currency})` : ''}${
                    priceRequired ? ` — ${t('bookFor.required')}` : ''
                  }`}
                  hint={priceRequired ? t('lessonRequests.noRate') : t('lessonRequests.leaveEmpty')}
                  value={price}
                  onChangeText={setPrice}
                  keyboardType="decimal-pad"
                  placeholder="0.00"
                />
              )}

              <Field
                label={t('lessonRequests.notesLabel')}
                placeholder={t('lessonRequests.notesPlaceholder')}
                value={adminNotes}
                onChangeText={setAdminNotes}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                style={styles.textarea}
              />

              <View style={styles.modalActions}>
                <Button
                  title={t('common.cancel')}
                  onPress={closeApprove}
                  variant="secondary"
                  style={styles.action}
                />
                <Button
                  title={
                    isBatch
                      ? t('lessonRequests.confirmMany', { count: approveTargets.length })
                      : t('lessonRequests.confirm')
                  }
                  onPress={confirmApprove}
                  loading={processing}
                  style={styles.action}
                />
              </View>
            </ScrollView>
          </Card>
        </View>
      </Modal>

      {/* Refus (L6) */}
      <Modal
        visible={showRejectModal}
        transparent
        animationType="fade"
        onRequestClose={closeReject}
      >
        <View style={styles.overlay}>
          <Card style={styles.modal}>
            <Text style={styles.modalTitle}>{t('lessonRequests.rejectTitle')}</Text>
            <Text style={styles.modalSubtitle}>{t('lessonRequests.rejectSubtitle')}</Text>

            <Field
              label={t('lessonRequests.rejectTitle')}
              placeholder={t('lessonRequests.rejectPlaceholder')}
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
                title={t('lessonRequests.reject')}
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
    checkbox: { paddingTop: 2 },
    avatar: {
      width: 44,
      height: 44,
      borderRadius: theme.radius.pill,
      backgroundColor: theme.colors.accentSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    info: { flex: 1, gap: 2 },
    student: {
      fontSize: theme.typography.size.base,
      fontWeight: theme.typography.weight.semibold,
      color: theme.colors.textPrimary,
    },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs },
    meta: { flex: 1, fontSize: theme.typography.size.sm, color: theme.colors.textSecondary },
    preferred: { flex: 1, fontSize: theme.typography.size.sm, color: theme.colors.warningText },
    quote: {
      marginTop: theme.spacing.xs,
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: theme.radius.md,
      padding: theme.spacing.md,
    },
    quoteText: { fontSize: theme.typography.size.sm, color: theme.colors.textSecondary },
    actions: { flexDirection: 'row', gap: theme.spacing.md },
    action: { flex: 1 },

    batchBar: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
      padding: theme.spacing.base,
      backgroundColor: theme.colors.surfaceRaised,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.border,
    },
    batchText: {
      flex: 1,
      fontSize: theme.typography.size.sm,
      fontWeight: theme.typography.weight.medium,
      color: theme.colors.textPrimary,
    },

    overlay: {
      flex: 1,
      backgroundColor: theme.colors.overlay,
      justifyContent: 'center',
      padding: theme.spacing.lg,
    },
    modal: { maxHeight: '88%' },
    modalBody: { gap: theme.spacing.md },
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
    hint: { fontSize: theme.typography.size.sm, color: theme.colors.textSecondary },
    textarea: { minHeight: 80 },
    modalActions: { flexDirection: 'row', gap: theme.spacing.md },
  });
