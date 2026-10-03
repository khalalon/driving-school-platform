/**
 * Demander une leçon (11.3) — L2 : la demande est adressée à l'école (D-32), l'instructeur n'est
 * qu'une préférence facultative, la date souhaitée est obligatoire (D-21) et le type est l'un des
 * trois de D-18. Le formulaire tient en une page : type, quand, avec qui, remarques.
 *
 * Depuis 15.9 (D-60), « quand » propose d'abord les **créneaux libres** des 14 prochains jours
 * (L10), groupés par jour avec leur instructeur : en choisir un fixe la date souhaitée et
 * l'instructeur préféré, et la demande reste à approuver par l'école. « Proposer une autre
 * date » revient à la saisie libre — d'office quand l'école n'a publié aucun créneau.
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Alert, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { lessonService } from '../../services/api/LessonService';
import { enrollmentService } from '../../services/api/EnrollmentService';
import { getApiErrorMessage } from '../../services/api/ApiError';
import { useI18n } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
import { AppBar, Button, Card, Chip, Field, Screen, SkeletonCard } from '../../components/ui';
import { FreeSlot, lessonTypeLabel, LESSON_TYPES, LessonType } from '../../models/Lesson';
import { Theme, textStyle } from '../../theme';
import type { Language } from '../../i18n';
import { IoniconName } from '../../utils/rtl';
import { dateLocale, formatPersonName, formatTime, toLocalDateKey } from '../../utils/format';

const LESSON_TYPE_ICONS: Record<LessonType, IoniconName> = {
  [LessonType.CODE]: 'book-outline',
  [LessonType.MANOEUVRE]: 'car-outline',
  [LessonType.PARC]: 'car-sport-outline',
};

/** Créneaux libres demandés à L10 : les deux prochaines semaines (plage maximale du serveur). */
const FREE_SLOT_DAYS = 14;
/** Au-delà, la liste deviendrait illisible : on propose plutôt une autre date. */
const MAX_SHOWN_SLOTS = 40;

const slotKey = (slot: FreeSlot): string => `${slot.start}|${slot.instructorId}`;

/** Créneaux groupés par jour local, dans l'ordre reçu (déjà trié par le serveur). */
const groupSlotsByDay = (slots: FreeSlot[]): { key: string; date: Date; slots: FreeSlot[] }[] => {
  const days = new Map<string, { key: string; date: Date; slots: FreeSlot[] }>();
  for (const slot of slots) {
    const date = new Date(slot.start);
    const key = toLocalDateKey(date);
    if (!days.has(key)) days.set(key, { key, date, slots: [] });
    days.get(key)?.slots.push(slot);
  }
  return [...days.values()];
};

/** Demain à 9 h : premier créneau proposé, dans le futur (exigé par L2). */
const defaultRequestedDate = (): Date => {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  date.setHours(9, 0, 0, 0);
  return date;
};

export const BookLessonScreen = ({ navigation, route }: any) => {
  const { t, language } = useI18n();
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme, language), [theme, language]);
  const { schoolId, preferredInstructorId, instructorName } = route.params;

  const [loading, setLoading] = useState(false);
  const [checkingEnrollment, setCheckingEnrollment] = useState(true);
  const [canBook, setCanBook] = useState(false);

  const [lessonType, setLessonType] = useState<LessonType>(LessonType.CODE);
  const [instructorId, setInstructorId] = useState<string | undefined>(preferredInstructorId);
  const [preferredName, setPreferredName] = useState<string | undefined>(instructorName);
  // Créneaux libres (L10) : chargés pour le type choisi ; repli sur la saisie libre (`manual`)
  const [slots, setSlots] = useState<FreeSlot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<FreeSlot | null>(null);
  const [manual, setManual] = useState(false);
  const [requestedDate, setRequestedDate] = useState<Date>(defaultRequestedDate);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    checkEnrollmentStatus();
  }, []);

  const checkEnrollmentStatus = async () => {
    try {
      setCheckingEnrollment(true);
      const status = await enrollmentService.checkEnrollmentStatus(schoolId);

      if (!status.canBook) {
        Alert.alert(t('school.enrollmentRequired'), t('school.enrollmentRequiredLesson'), [
          { text: t('common.ok'), onPress: () => navigation.goBack() },
        ]);
      }

      setCanBook(status.canBook);
    } catch (error) {
      Alert.alert(t('common.error'), getApiErrorMessage(error, t('book.checkFailed')));
      navigation.goBack();
    } finally {
      setCheckingEnrollment(false);
    }
  };

  const loadSlots = useCallback(async (type: LessonType) => {
    const from = new Date();
    const to = new Date(from.getTime() + FREE_SLOT_DAYS * 86_400_000);
    try {
      setSlotsLoading(true);
      const data = await lessonService.getFreeSlots(type, from.toISOString(), to.toISOString());
      setSlots(data);
      // Aucun créneau publié : la saisie libre d'office
      setManual(data.length === 0);
    } catch {
      // Créneaux indisponibles : l'élève peut toujours proposer une date
      setSlots([]);
      setManual(true);
    } finally {
      setSlotsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!canBook) return;
    setSelectedSlot(null);
    loadSlots(lessonType);
  }, [canBook, lessonType, loadSlots]);

  const chooseSlot = (slot: FreeSlot) => {
    setSelectedSlot(slot);
    setRequestedDate(new Date(slot.start));
    setInstructorId(slot.instructorId);
    setPreferredName(
      formatPersonName(
        { firstName: slot.instructorFirstName, lastName: slot.instructorLastName },
        t('myLessons.instructorFallback')
      )
    );
  };

  const switchToManual = () => {
    setSelectedSlot(null);
    setManual(true);
  };

  const handleDateChange = (_event: unknown, selected?: Date) => {
    setShowDatePicker(false);
    if (selected) {
      const next = new Date(requestedDate);
      next.setFullYear(selected.getFullYear(), selected.getMonth(), selected.getDate());
      setRequestedDate(next);
    }
  };

  const handleTimeChange = (_event: unknown, selected?: Date) => {
    setShowTimePicker(false);
    if (selected) {
      const next = new Date(requestedDate);
      next.setHours(selected.getHours(), selected.getMinutes(), 0, 0);
      setRequestedDate(next);
    }
  };

  const handleRequestLesson = async () => {
    if (!manual && !selectedSlot) {
      Alert.alert(t('book.pickSlotTitle'), t('book.pickSlotText'));
      return;
    }
    if (requestedDate.getTime() <= Date.now()) {
      Alert.alert(t('book.invalidDate'), t('book.dateMustBeFuture'));
      return;
    }

    try {
      setLoading(true);

      // L2 : la demande part à l'école, l'instructeur qui l'approuvera fixera la date définitive
      await lessonService.requestLesson({
        type: lessonType,
        requestedDate: requestedDate.toISOString(),
        preferredInstructorId: instructorId,
        notes: notes.trim() || undefined,
      });

      Alert.alert(t('school.requestSent'), t('book.requestSentText'), [
        {
          text: t('common.ok'),
          onPress: () => navigation.navigate('StudentTabs', { screen: 'MyLessons' }),
        },
      ]);
    } catch (error) {
      Alert.alert(t('common.error'), getApiErrorMessage(error, t('book.requestFailed')));
    } finally {
      setLoading(false);
    }
  };

  if (!checkingEnrollment && !canBook) {
    return null;
  }

  return (
    <View style={styles.flex}>
      <AppBar
        title={t('book.title')}
        onBack={() => navigation.goBack()}
        backLabel={t('common.back')}
      />

      <Screen contentContainerStyle={styles.content} edges={[]}>
        {checkingEnrollment ? (
          <>
            <SkeletonCard lines={2} />
            <SkeletonCard lines={3} />
          </>
        ) : (
          <>
            <Card highlighted elevation="none" style={styles.info}>
              <Ionicons name="information-circle" size={22} color={theme.colors.signalText} />
              <View style={styles.infoBody}>
                <Text style={styles.infoTitle}>{t('book.howItWorks')}</Text>
                <Text style={styles.infoText}>{t('book.howItWorksText')}</Text>
              </View>
            </Card>

            <View style={styles.section}>
              <Text style={styles.label}>{t('book.lessonType')}</Text>
              <View style={styles.types}>
                {LESSON_TYPES.map((type) => (
                  <Chip
                    key={type}
                    label={lessonTypeLabel(type)}
                    icon={LESSON_TYPE_ICONS[type]}
                    selected={lessonType === type}
                    onPress={() => setLessonType(type)}
                  />
                ))}
              </View>
            </View>

            {manual ? null : (
              <View style={styles.section} testID="book-free-slots">
                <Text style={styles.label}>{t('book.freeSlots')}</Text>
                <Text style={styles.helper}>{t('book.freeSlotsHint')}</Text>
                {slotsLoading ? (
                  <SkeletonCard lines={2} />
                ) : (
                  groupSlotsByDay(slots.slice(0, MAX_SHOWN_SLOTS)).map((day) => (
                    <View key={day.key} style={styles.slotDay}>
                      <Text style={styles.slotDayTitle} accessibilityRole="header">
                        {day.date.toLocaleDateString(dateLocale(), {
                          weekday: 'long',
                          day: 'numeric',
                          month: 'short',
                        })}
                      </Text>
                      <View style={styles.types}>
                        {day.slots.map((slot) => {
                          const who = formatPersonName(
                            {
                              firstName: slot.instructorFirstName,
                              lastName: slot.instructorLastName,
                            },
                            t('myLessons.instructorFallback')
                          );
                          return (
                            <Chip
                              key={slotKey(slot)}
                              label={`${formatTime(slot.start)} · ${who}`}
                              icon="time-outline"
                              selected={
                                selectedSlot !== null && slotKey(selectedSlot) === slotKey(slot)
                              }
                              onPress={() => chooseSlot(slot)}
                              testID={`book-slot-${slotKey(slot)}`}
                            />
                          );
                        })}
                      </View>
                    </View>
                  ))
                )}
                <Button
                  title={t('book.otherDate')}
                  onPress={switchToManual}
                  variant="ghost"
                  size="sm"
                  icon="calendar-outline"
                  testID="book-other-date"
                />
              </View>
            )}

            {manual ? (
              <View style={styles.section}>
                {slots.length === 0 && !slotsLoading ? (
                  <Text style={styles.helper} testID="book-no-slots">
                    {t('book.noFreeSlots')}
                  </Text>
                ) : (
                  <Button
                    title={t('book.backToSlots')}
                    onPress={() => setManual(false)}
                    variant="ghost"
                    size="sm"
                    icon="time-outline"
                    testID="book-back-to-slots"
                  />
                )}
                <Text style={styles.label}>{t('book.requestedDate')}</Text>
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
                      {requestedDate.toLocaleDateString(dateLocale())}
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => setShowTimePicker(true)}
                    accessibilityRole="button"
                    style={({ pressed }) => [styles.dateButton, pressed && styles.pressed]}
                  >
                    <Ionicons name="time-outline" size={20} color={theme.colors.textSecondary} />
                    <Text style={styles.dateText}>
                      {requestedDate.toLocaleTimeString(dateLocale(), {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </Text>
                  </Pressable>
                </View>
                {showDatePicker && (
                  <DateTimePicker
                    value={requestedDate}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onValueChange={handleDateChange}
                    onDismiss={() => setShowDatePicker(false)}
                    minimumDate={new Date()}
                  />
                )}
                {showTimePicker && (
                  <DateTimePicker
                    value={requestedDate}
                    mode="time"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onValueChange={handleTimeChange}
                    onDismiss={() => setShowTimePicker(false)}
                  />
                )}
                <Text style={styles.helper}>{t('book.dateHelper')}</Text>
              </View>
            ) : null}

            <View style={styles.section}>
              <Text style={styles.label}>{t('book.preferredInstructor')}</Text>
              <Card style={styles.instructorCard} elevation="none">
                <View style={styles.instructorIcon}>
                  <Ionicons
                    name={instructorId ? 'person' : 'people-outline'}
                    size={22}
                    color={instructorId ? theme.colors.signalText : theme.colors.textMuted}
                  />
                </View>
                <View style={styles.instructorBody}>
                  <Text style={styles.instructorName}>
                    {instructorId
                      ? preferredName || t('myLessons.instructorFallback')
                      : t('book.noPreference')}
                  </Text>
                  <Text style={styles.helper}>
                    {instructorId ? t('book.preferenceHint') : t('book.pickInstructorHint')}
                  </Text>
                </View>
                {instructorId ? (
                  <Pressable
                    onPress={() => {
                      setInstructorId(undefined);
                      setPreferredName(undefined);
                    }}
                    hitSlop={12}
                    accessibilityRole="button"
                    accessibilityLabel={t('book.removePreferred')}
                  >
                    <Ionicons name="close-circle" size={22} color={theme.colors.textMuted} />
                  </Pressable>
                ) : null}
              </Card>
            </View>

            <Field
              label={t('book.notes')}
              placeholder={t('book.notesPlaceholder')}
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              style={styles.notes}
            />

            <Button
              title={t('book.sendRequest')}
              onPress={handleRequestLesson}
              loading={loading}
              icon="send"
              iconPosition="trailing"
              fullWidth
              style={styles.submit}
            />
          </>
        )}
      </Screen>
    </View>
  );
};

const createStyles = (theme: Theme, language: Language) =>
  StyleSheet.create({
    flex: { flex: 1, backgroundColor: theme.colors.surface },
    content: { paddingTop: theme.spacing.base, gap: theme.spacing.lg },
    info: { flexDirection: 'row', alignItems: 'flex-start', gap: theme.spacing.md },
    infoBody: { flex: 1, gap: 2 },
    infoTitle: {
      ...textStyle('label', language),
      color: theme.colors.signalText,
    },
    infoText: { ...textStyle('caption', language), color: theme.colors.signalText },
    section: { gap: theme.spacing.sm },
    label: {
      ...textStyle('label', language),
      color: theme.colors.textSecondary,
    },
    types: { flexDirection: 'row', gap: theme.spacing.sm, flexWrap: 'wrap' },
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
    dateText: { ...textStyle('body', language), color: theme.colors.textPrimary },
    helper: { ...textStyle('caption', language), color: theme.colors.textMuted },
    slotDay: { gap: theme.spacing.xs },
    slotDayTitle: { ...textStyle('caption', language), color: theme.colors.textSecondary },
    instructorCard: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md },
    instructorIcon: {
      width: 40,
      height: 40,
      borderRadius: theme.radius.pill,
      backgroundColor: theme.colors.surfaceMuted,
      alignItems: 'center',
      justifyContent: 'center',
    },
    instructorBody: { flex: 1, gap: 2 },
    instructorName: {
      ...textStyle('body', language),
      color: theme.colors.textPrimary,
    },
    notes: { minHeight: 96 },
    submit: { marginTop: theme.spacing.sm },
  });
