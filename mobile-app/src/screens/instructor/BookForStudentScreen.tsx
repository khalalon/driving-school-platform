/**
 * Réserver pour un élève (11.4) — L4.
 *
 * L'élève est choisi dans la liste des élèves autorisés de l'école (S6, D-25) : `studentId`
 * est un users.id, jamais un email. La leçon est planifiée d'emblée (`scheduled`) avec
 * l'appelant pour instructeur ; le prix vient de la grille (S4) ou est saisi s'il n'y a pas de
 * tarif pour ce type (D-30).
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Alert, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useAuth } from '../../context/AuthContext';
import { useI18n } from '../../context/LanguageContext';
import { useToast } from '../../context/ToastContext';
import { useTheme } from '../../context/ThemeContext';
import { AppBar, Button, Card, Chip, Field, ListRow, Screen, Skeleton } from '../../components/ui';
import { lessonService } from '../../services/api/LessonService';
import { schoolService } from '../../services/api/SchoolService';
import { getApiErrorMessage } from '../../services/api/ApiError';
import { lessonTypeLabel, LESSON_TYPES, LessonType } from '../../models/Lesson';
import { SchoolPricing, SchoolStudent } from '../../models/School';
import { useSchoolCurrency } from '../../hooks/useSchoolCurrency';
import { dateLocale, formatAmount, formatPersonName } from '../../utils/format';
import { Theme } from '../../theme';

const DEFAULT_DURATION_MINUTES = 60;

/** Demain à 9 h : premier créneau proposé. */
const tomorrowMorning = (): Date => {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  date.setHours(9, 0, 0, 0);
  return date;
};

export const BookForStudentScreen = ({ navigation }: any) => {
  const { t } = useI18n();
  const { showToast } = useToast();
  const { user } = useAuth();
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const schoolId = user?.schoolId;
  const currency = useSchoolCurrency(schoolId);

  const [loadingStudents, setLoadingStudents] = useState(true);
  const [students, setStudents] = useState<SchoolStudent[]>([]);
  const [pricing, setPricing] = useState<SchoolPricing[] | null>(null);
  const [search, setSearch] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<SchoolStudent | null>(null);

  const [loading, setLoading] = useState(false);
  const [lessonType, setLessonType] = useState<LessonType>(LessonType.CODE);
  const [scheduledDate, setScheduledDate] = useState<Date>(tomorrowMorning);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [duration, setDuration] = useState(String(DEFAULT_DURATION_MINUTES));
  const [price, setPrice] = useState('');
  const [notes, setNotes] = useState('');

  // Onglet (8.4) : la liste S6 est rechargée à chaque retour au premier plan
  useFocusEffect(
    useCallback(() => {
      loadSchoolData();
    }, [schoolId])
  );

  const loadSchoolData = async () => {
    if (!schoolId) {
      Alert.alert(t('today.noSchool'), t('today.noSchoolText'), [
        { text: t('common.ok'), onPress: () => navigation.navigate('InstructorDashboard') },
      ]);
      return;
    }
    try {
      setLoadingStudents(true);
      // S6 : élèves autorisés de l'école ; S4 : grille (durée et prix par type)
      const [studentList, pricingResult] = await Promise.all([
        schoolService.getSchoolStudents(schoolId),
        schoolService.getSchoolPricing(schoolId).catch(() => null),
      ]);
      setStudents(studentList);
      setPricing(pricingResult);
    } catch (error) {
      Alert.alert(t('common.error'), getApiErrorMessage(error, t('bookFor.loadFailed')));
    } finally {
      setLoadingStudents(false);
    }
  };

  const rate = useMemo(
    () => (pricing ? pricing.find((p) => p.lessonType === lessonType) : undefined),
    [pricing, lessonType]
  );
  const priceRequired = pricing !== null && !rate;

  // La durée suit la grille quand le type change (l'instructeur peut la modifier ensuite)
  useEffect(() => {
    setDuration(String(rate?.duration ?? DEFAULT_DURATION_MINUTES));
  }, [rate]);

  const filteredStudents = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return students;
    return students.filter(
      (s) =>
        `${s.firstName} ${s.lastName}`.toLowerCase().includes(needle) ||
        s.email.toLowerCase().includes(needle)
    );
  }, [students, search]);

  /** Fiche élève (P1–P7) depuis la liste S6 : `studentId` = users.id (D-28). */
  const openStudentProfile = (student: SchoolStudent) => {
    navigation.navigate('StudentProfile', {
      studentId: student.studentId,
      schoolId,
      studentName: formatPersonName(student, student.email),
    });
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

  const handleBookLesson = async () => {
    if (!selectedStudent) {
      Alert.alert(t('common.required'), t('bookFor.selectStudent'));
      return;
    }
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
    if (priceRequired && priceValue === undefined) {
      Alert.alert(
        t('lessonRequests.priceRequired'),
        t('lessonRequests.priceRequiredText', { type: lessonTypeLabel(lessonType) })
      );
      return;
    }

    try {
      setLoading(true);
      // L4 : studentId = users.id choisi dans S6 ; leçon planifiée, prix figé (D-30)
      await lessonService.bookLessonForStudent({
        studentId: selectedStudent.studentId,
        type: lessonType,
        scheduledDate: scheduledDate.toISOString(),
        durationMinutes,
        price: priceValue,
        notes: notes.trim() || undefined,
      });

      showToast(
        t('bookFor.booked', {
          student: formatPersonName(selectedStudent, t('attendance.theStudent')),
        })
      );
      navigation.navigate('InstructorDashboard');
    } catch (error) {
      Alert.alert(t('common.error'), getApiErrorMessage(error, t('bookFor.bookFailed')));
    } finally {
      setLoading(false);
    }
  };

  const studentMeta = (student: SchoolStudent) =>
    `${student.email} · ${t('bookFor.lessonsCompleted', { count: student.completedLessons })}`;

  return (
    <View style={styles.flex}>
      <AppBar title={t('bookFor.title')} large />

      <Screen contentContainerStyle={styles.content} edges={[]}>
        <Card highlighted elevation="none" style={styles.info}>
          <Ionicons name="information-circle" size={22} color={theme.colors.accentText} />
          <Text style={styles.infoText}>{t('bookFor.info')}</Text>
        </Card>

        {/* Élève (S6) */}
        <View style={styles.section}>
          <Text style={styles.label}>{t('bookFor.student')}</Text>
          {selectedStudent ? (
            <Card padded={false}>
              <ListRow
                title={formatPersonName(selectedStudent)}
                subtitle={studentMeta(selectedStudent)}
                icon="person"
                tone="accent"
                style={styles.row}
                trailing={
                  <View style={styles.rowActions}>
                    <Pressable
                      onPress={() => openStudentProfile(selectedStudent)}
                      hitSlop={8}
                      accessibilityRole="button"
                      accessibilityLabel={t('bookFor.viewProfile')}
                    >
                      <Ionicons
                        name="person-circle-outline"
                        size={24}
                        color={theme.colors.accentText}
                      />
                    </Pressable>
                    <Pressable
                      onPress={() => setSelectedStudent(null)}
                      hitSlop={8}
                      accessibilityRole="button"
                      accessibilityLabel={t('bookFor.changeStudent')}
                    >
                      <Ionicons name="close-circle" size={22} color={theme.colors.textMuted} />
                    </Pressable>
                  </View>
                }
              />
            </Card>
          ) : (
            <>
              <Field
                label={t('bookFor.student')}
                placeholder={t('bookFor.searchPlaceholder')}
                value={search}
                onChangeText={setSearch}
                icon="search-outline"
                autoCapitalize="none"
                autoCorrect={false}
                containerStyle={styles.search}
              />
              <Card padded={false}>
                {loadingStudents ? (
                  <View style={styles.listLoader}>
                    <Skeleton height={18} />
                    <Skeleton height={18} width="70%" />
                  </View>
                ) : filteredStudents.length === 0 ? (
                  <Text style={styles.empty}>
                    {students.length === 0 ? t('bookFor.noStudents') : t('bookFor.noMatch')}
                  </Text>
                ) : (
                  filteredStudents.map((student, index) => (
                    <ListRow
                      key={student.studentId}
                      title={formatPersonName(student)}
                      subtitle={studentMeta(student)}
                      icon="person-outline"
                      tone="neutral"
                      onPress={() => setSelectedStudent(student)}
                      style={index === filteredStudents.length - 1 ? styles.rowLast : styles.row}
                      trailing={
                        <Pressable
                          onPress={() => openStudentProfile(student)}
                          hitSlop={8}
                          accessibilityRole="button"
                          accessibilityLabel={t('bookFor.viewProfile')}
                        >
                          <Ionicons
                            name="person-circle-outline"
                            size={24}
                            color={theme.colors.accentText}
                          />
                        </Pressable>
                      }
                    />
                  ))
                )}
              </Card>
            </>
          )}
        </View>

        {/* Type de leçon (D-18) */}
        <View style={styles.section}>
          <Text style={styles.label}>{t('book.lessonType')}</Text>
          <View style={styles.types}>
            {LESSON_TYPES.map((type) => (
              <Chip
                key={type}
                label={lessonTypeLabel(type)}
                selected={lessonType === type}
                onPress={() => setLessonType(type)}
              />
            ))}
          </View>
        </View>

        {/* Date et heure */}
        <View style={styles.section}>
          <Text style={styles.label}>{t('lessonRequests.dateTime')}</Text>
          <View style={styles.dateRow}>
            <Pressable
              onPress={() => setShowDatePicker(true)}
              accessibilityRole="button"
              style={({ pressed }) => [styles.dateButton, styles.grow, pressed && styles.pressed]}
            >
              <Ionicons name="calendar-outline" size={20} color={theme.colors.textSecondary} />
              <Text style={styles.dateText}>{scheduledDate.toLocaleDateString(dateLocale())}</Text>
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
          icon="hourglass-outline"
        />

        {/* Prix (D-30) : la grille fait foi, la saisie n'apparaît qu'à défaut */}
        {rate ? (
          <View style={styles.section}>
            <Text style={styles.label}>
              {t('bookFor.price')}
              {currency ? ` (${currency})` : ''}
            </Text>
            <Text style={styles.hint}>
              {t('bookFor.schoolRate', { amount: formatAmount(rate.price, currency) })}
            </Text>
          </View>
        ) : (
          <Field
            label={`${t('bookFor.price')}${currency ? ` (${currency})` : ''}${
              priceRequired ? ` — ${t('bookFor.required')}` : ''
            }`}
            hint={priceRequired ? t('lessonRequests.noRate') : t('lessonRequests.leaveEmpty')}
            value={price}
            onChangeText={setPrice}
            keyboardType="decimal-pad"
            placeholder="0.00"
            icon="cash-outline"
          />
        )}

        <Field
          label={t('bookFor.notes')}
          placeholder={t('bookFor.notesPlaceholder')}
          value={notes}
          onChangeText={setNotes}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
          style={styles.notes}
        />

        <Button
          title={t('bookFor.book')}
          onPress={handleBookLesson}
          loading={loading}
          disabled={!selectedStudent}
          icon="checkmark"
          iconPosition="trailing"
          fullWidth
          style={styles.submit}
        />
      </Screen>
    </View>
  );
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    flex: { flex: 1, backgroundColor: theme.colors.surface },
    content: { paddingTop: theme.spacing.base, gap: theme.spacing.lg },
    info: { flexDirection: 'row', alignItems: 'flex-start', gap: theme.spacing.md },
    infoText: {
      flex: 1,
      fontSize: theme.typography.size.sm,
      color: theme.colors.accentText,
      lineHeight: theme.typography.size.sm * theme.typography.lineHeight.normal,
    },
    section: { gap: theme.spacing.sm },
    label: {
      fontSize: theme.typography.size.sm,
      fontWeight: theme.typography.weight.medium,
      color: theme.colors.textSecondary,
    },
    search: { marginBottom: theme.spacing.sm },
    row: {
      paddingHorizontal: theme.spacing.base,
      borderBottomWidth: StyleSheet.hairlineWidth,
    },
    rowLast: { paddingHorizontal: theme.spacing.base },
    rowActions: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
    listLoader: { padding: theme.spacing.base, gap: theme.spacing.sm },
    empty: {
      padding: theme.spacing.base,
      fontSize: theme.typography.size.sm,
      color: theme.colors.textMuted,
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
    dateText: { fontSize: theme.typography.size.base, color: theme.colors.textPrimary },
    hint: { fontSize: theme.typography.size.sm, color: theme.colors.textSecondary },
    notes: { minHeight: 96 },
    submit: { marginTop: theme.spacing.sm },
  });
