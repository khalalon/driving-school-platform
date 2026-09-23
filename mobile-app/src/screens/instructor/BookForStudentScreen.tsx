/**
 * Book For Student Screen - Minimal & Elegant
 * Single Responsibility: Instructor books a lesson directly for an enrolled student (L4)
 *
 * L'élève est choisi dans la liste des élèves autorisés de l'école (S6, D-25) : `studentId`
 * est un users.id, jamais un email. La leçon est planifiée d'emblée (`scheduled`) avec
 * l'appelant pour instructeur ; le prix vient de la grille (S4) ou est saisi s'il n'y a pas de
 * tarif pour ce type (D-30).
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useAuth } from '../../context/AuthContext';
import { useI18n } from '../../context/LanguageContext';
import { lessonService } from '../../services/api/LessonService';
import { schoolService } from '../../services/api/SchoolService';
import { getApiErrorMessage } from '../../services/api/ApiError';
import { lessonTypeLabel, LESSON_TYPES, LessonType } from '../../models/Lesson';
import { SchoolPricing, SchoolStudent } from '../../models/School';
import { useSchoolCurrency } from '../../hooks/useSchoolCurrency';
import { formatAmount, formatPersonName } from '../../utils/format';
import { colors, typography, spacing, shadows } from '../../theme';

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
  const { user } = useAuth();
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
        {
          text: 'OK',
          onPress: () => navigation.navigate('InstructorDashboard'),
        },
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

      Alert.alert(
        t('common.success'),
        t('bookFor.booked', {
          student: formatPersonName(selectedStudent, t('attendance.theStudent')),
        }),
        [
          {
            text: 'OK',
            onPress: () => navigation.navigate('InstructorDashboard'),
          },
        ]
      );
    } catch (error) {
      Alert.alert(t('common.error'), getApiErrorMessage(error, t('bookFor.bookFailed')));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('bookFor.title')}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.infoBox}>
          <Ionicons name="information-circle-outline" size={24} color={colors.primary[600]} />
          <Text style={styles.infoText}>
            Book a lesson directly for an enrolled student (walk-in or phone booking). You will be
            the instructor of this lesson.
          </Text>
        </View>

        {/* Student (S6) */}
        <View style={styles.section}>
          <Text style={styles.label}>{t('bookFor.student')}</Text>
          {selectedStudent ? (
            <View style={styles.selectedStudent}>
              <View style={styles.studentAvatar}>
                <Ionicons name="person" size={20} color={colors.primary[600]} />
              </View>
              <View style={styles.studentInfo}>
                <Text style={styles.studentName}>{formatPersonName(selectedStudent)}</Text>
                <Text style={styles.studentMeta}>
                  {selectedStudent.email} · {selectedStudent.completedLessons} lessons completed
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => openStudentProfile(selectedStudent)}
                style={styles.clearButton}
                activeOpacity={0.7}
                accessibilityLabel="View student profile"
              >
                <Ionicons name="person-circle-outline" size={24} color={colors.primary[600]} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setSelectedStudent(null)}
                style={styles.clearButton}
                activeOpacity={0.7}
                accessibilityLabel="Change student"
              >
                <Ionicons name="close-circle" size={22} color={colors.neutral[400]} />
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <View style={styles.inputContainer}>
                <Ionicons
                  name="search-outline"
                  size={20}
                  color={colors.neutral[400]}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder={t('bookFor.searchPlaceholder')}
                  placeholderTextColor={colors.neutral[400]}
                  value={search}
                  onChangeText={setSearch}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
              <View style={styles.studentList}>
                {loadingStudents ? (
                  <ActivityIndicator
                    size="small"
                    color={colors.primary[600]}
                    style={styles.listLoader}
                  />
                ) : filteredStudents.length === 0 ? (
                  <Text style={styles.emptyText}>
                    {students.length === 0 ? t('bookFor.noStudents') : t('bookFor.noMatch')}
                  </Text>
                ) : (
                  filteredStudents.map((student) => (
                    <TouchableOpacity
                      key={student.studentId}
                      style={styles.studentRow}
                      onPress={() => setSelectedStudent(student)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.studentAvatar}>
                        <Ionicons name="person-outline" size={20} color={colors.primary[600]} />
                      </View>
                      <View style={styles.studentInfo}>
                        <Text style={styles.studentName}>{formatPersonName(student)}</Text>
                        <Text style={styles.studentMeta}>
                          {student.email} · {student.completedLessons} lessons completed
                        </Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => openStudentProfile(student)}
                        style={styles.clearButton}
                        activeOpacity={0.7}
                        accessibilityLabel="View student profile"
                      >
                        <Ionicons
                          name="person-circle-outline"
                          size={24}
                          color={colors.primary[600]}
                        />
                      </TouchableOpacity>
                    </TouchableOpacity>
                  ))
                )}
              </View>
            </>
          )}
        </View>

        {/* Lesson type (D-18) */}
        <View style={styles.section}>
          <Text style={styles.label}>{t('book.lessonType')}</Text>
          <View style={styles.typeContainer}>
            {LESSON_TYPES.map((type) => {
              const active = lessonType === type;
              return (
                <TouchableOpacity
                  key={type}
                  style={[styles.typeButton, active && styles.typeButtonActive]}
                  onPress={() => setLessonType(type)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.typeButtonText, active && styles.typeButtonTextActive]}>
                    {lessonTypeLabel(type)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Date & time */}
        <View style={styles.section}>
          <Text style={styles.label}>{t('lessonRequests.dateTime')}</Text>
          <View style={styles.dateRow}>
            <TouchableOpacity
              style={[styles.dateButton, styles.dateButtonGrow]}
              onPress={() => setShowDatePicker(true)}
              activeOpacity={0.7}
            >
              <Ionicons name="calendar-outline" size={20} color={colors.text.secondary} />
              <Text style={styles.dateText}>{scheduledDate.toLocaleDateString()}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => setShowTimePicker(true)}
              activeOpacity={0.7}
            >
              <Ionicons name="time-outline" size={20} color={colors.text.secondary} />
              <Text style={styles.dateText}>
                {scheduledDate.toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
            </TouchableOpacity>
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

        {/* Duration */}
        <View style={styles.section}>
          <Text style={styles.label}>{t('lessonRequests.duration')}</Text>
          <View style={styles.inputContainer}>
            <Ionicons
              name="hourglass-outline"
              size={20}
              color={colors.neutral[400]}
              style={styles.inputIcon}
            />
            <TextInput
              style={styles.input}
              value={duration}
              onChangeText={setDuration}
              keyboardType="number-pad"
              placeholder={String(DEFAULT_DURATION_MINUTES)}
              placeholderTextColor={colors.neutral[400]}
            />
          </View>
        </View>

        {/* Price (D-30) */}
        <View style={styles.section}>
          <Text style={styles.label}>
            Price{currency ? ` (${currency})` : ''}
            {priceRequired ? ' — required' : ''}
          </Text>
          {rate ? (
            <Text style={styles.rateText}>
              School rate: {formatAmount(rate.price, currency)} (applied automatically)
            </Text>
          ) : (
            <>
              <View style={styles.inputContainer}>
                <Ionicons
                  name="cash-outline"
                  size={20}
                  color={colors.neutral[400]}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  value={price}
                  onChangeText={setPrice}
                  keyboardType="decimal-pad"
                  placeholder="0.00"
                  placeholderTextColor={colors.neutral[400]}
                />
              </View>
              <Text style={styles.hintText}>
                {priceRequired ? t('lessonRequests.noRate') : t('lessonRequests.leaveEmpty')}
              </Text>
            </>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>{t('bookFor.notes')}</Text>
          <TextInput
            style={styles.notesInput}
            placeholder={t('bookFor.notesPlaceholder')}
            placeholderTextColor={colors.neutral[400]}
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        <TouchableOpacity
          style={[styles.bookButton, (loading || !selectedStudent) && styles.disabledButton]}
          onPress={handleBookLesson}
          disabled={loading || !selectedStudent}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator size="small" color={colors.text.inverse} />
          ) : (
            <>
              <Text style={styles.bookButtonText}>{t('bookFor.book')}</Text>
              <Ionicons name="checkmark" size={20} color={colors.text.inverse} />
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  headerTitle: {
    fontSize: typography.size.xl,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
  },
  content: {
    padding: spacing.xl,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: colors.primary[50],
    padding: spacing.base,
    borderRadius: 12,
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  infoText: {
    flex: 1,
    fontSize: typography.size.sm,
    color: colors.text.secondary,
    lineHeight: typography.size.sm * typography.lineHeight.normal,
  },
  section: {
    marginBottom: spacing.xl,
  },
  label: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.medium,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.primary,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border.default,
    paddingHorizontal: spacing.base,
    height: 52,
  },
  inputIcon: {
    marginEnd: spacing.md,
  },
  input: {
    flex: 1,
    fontSize: typography.size.base,
    color: colors.text.primary,
  },
  studentList: {
    marginTop: spacing.sm,
    backgroundColor: colors.background.primary,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border.default,
    maxHeight: 280,
    overflow: 'hidden',
  },
  listLoader: {
    padding: spacing.lg,
  },
  studentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  selectedStudent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.background.primary,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.primary[600],
    padding: spacing.base,
  },
  studentAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  studentInfo: {
    flex: 1,
    gap: 2,
  },
  studentName: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
  },
  studentMeta: {
    fontSize: typography.size.xs,
    color: colors.text.tertiary,
  },
  clearButton: {
    padding: spacing.xs,
  },
  emptyText: {
    padding: spacing.lg,
    textAlign: 'center',
    fontSize: typography.size.sm,
    color: colors.text.tertiary,
  },
  typeContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  typeButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background.primary,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border.default,
    paddingVertical: spacing.md,
  },
  typeButtonActive: {
    backgroundColor: colors.primary[600],
    borderColor: colors.primary[600],
  },
  typeButtonText: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.medium,
    color: colors.text.secondary,
  },
  typeButtonTextActive: {
    color: colors.text.inverse,
  },
  dateRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.primary,
    paddingHorizontal: spacing.base,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border.default,
    gap: spacing.sm,
    height: 52,
  },
  dateButtonGrow: {
    flex: 1,
  },
  dateText: {
    fontSize: typography.size.base,
    color: colors.text.primary,
  },
  rateText: {
    fontSize: typography.size.sm,
    color: colors.success[600],
    fontWeight: typography.weight.medium,
  },
  hintText: {
    fontSize: typography.size.xs,
    color: colors.text.tertiary,
    marginTop: spacing.xs,
  },
  notesInput: {
    backgroundColor: colors.background.primary,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border.default,
    padding: spacing.base,
    fontSize: typography.size.base,
    color: colors.text.primary,
    minHeight: 100,
  },
  bookButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary[600],
    paddingVertical: spacing.base,
    borderRadius: 12,
    gap: spacing.sm,
    marginTop: spacing.base,
    ...shadows.sm,
  },
  bookButtonText: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.semibold,
    color: colors.text.inverse,
  },
  disabledButton: {
    opacity: 0.5,
  },
});
