/**
 * Book Lesson Screen - Minimal & Elegant
 * Single Responsibility: Student requests a lesson from the school (L2)
 *
 * La demande est adressée à l'école (D-32) : l'instructeur n'est qu'une préférence facultative,
 * la date souhaitée est obligatoire (D-21) et le type est l'un des trois de D-18.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  TextInput,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { lessonService } from '../../services/api/LessonService';
import { enrollmentService } from '../../services/api/EnrollmentService';
import { getApiErrorMessage } from '../../services/api/ApiError';
import { useI18n } from '../../context/LanguageContext';
import { lessonTypeLabel, LESSON_TYPES, LessonType } from '../../models/Lesson';
import { colors, typography, spacing, shadows } from '../../theme';
import { mirrorIcon } from '../../utils/rtl';

const LESSON_TYPE_ICONS: Record<LessonType, keyof typeof Ionicons.glyphMap> = {
  [LessonType.CODE]: 'book-outline',
  [LessonType.MANOEUVRE]: 'car-outline',
  [LessonType.PARC]: 'car-sport-outline',
};

/** Demain à 9 h : premier créneau proposé, dans le futur (exigé par L2). */
const defaultRequestedDate = (): Date => {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  date.setHours(9, 0, 0, 0);
  return date;
};

export const BookLessonScreen = ({ navigation, route }: any) => {
  const { t } = useI18n();
  const { schoolId, preferredInstructorId, instructorName } = route.params;

  const [loading, setLoading] = useState(false);
  const [checkingEnrollment, setCheckingEnrollment] = useState(true);
  const [canBook, setCanBook] = useState(false);

  const [lessonType, setLessonType] = useState<LessonType>(LessonType.CODE);
  const [instructorId, setInstructorId] = useState<string | undefined>(preferredInstructorId);
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
          { text: 'OK', onPress: () => navigation.goBack() },
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
          text: 'OK',
          onPress: () => navigation.navigate('StudentTabs', { screen: 'MyLessons' }),
        },
      ]);
    } catch (error) {
      Alert.alert(t('common.error'), getApiErrorMessage(error, t('book.requestFailed')));
    } finally {
      setLoading(false);
    }
  };

  if (checkingEnrollment) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary[600]} />
        <Text style={styles.loadingText}>{t('book.checkingEnrollment')}</Text>
      </View>
    );
  }

  if (!canBook) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Ionicons name={mirrorIcon('arrow-back')} size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Request Lesson</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Info Card */}
        <View style={styles.infoCard}>
          <Ionicons name="information-circle-outline" size={24} color={colors.primary[600]} />
          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>{t('book.howItWorks')}</Text>
            <Text style={styles.infoText}>{t('book.howItWorksText')}</Text>
          </View>
        </View>

        {/* Lesson Type */}
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
                  <Ionicons
                    name={LESSON_TYPE_ICONS[type]}
                    size={22}
                    color={active ? colors.text.inverse : colors.text.secondary}
                  />
                  <Text style={[styles.typeButtonText, active && styles.typeButtonTextActive]}>
                    {lessonTypeLabel(type)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Requested Date */}
        <View style={styles.section}>
          <Text style={styles.label}>{t('book.requestedDate')}</Text>
          <View style={styles.dateRow}>
            <TouchableOpacity
              style={[styles.dateButton, styles.dateButtonGrow]}
              onPress={() => setShowDatePicker(true)}
              activeOpacity={0.7}
            >
              <Ionicons name="calendar-outline" size={20} color={colors.text.secondary} />
              <Text style={styles.dateText}>{requestedDate.toLocaleDateString()}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => setShowTimePicker(true)}
              activeOpacity={0.7}
            >
              <Ionicons name="time-outline" size={20} color={colors.text.secondary} />
              <Text style={styles.dateText}>
                {requestedDate.toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
            </TouchableOpacity>
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
          <Text style={styles.helperText}>{t('book.dateHelper')}</Text>
        </View>

        {/* Preferred Instructor (optional) */}
        <View style={styles.section}>
          <Text style={styles.label}>{t('book.preferredInstructor')}</Text>
          {instructorId ? (
            <View style={styles.instructorCard}>
              <View style={styles.instructorIconContainer}>
                <Ionicons name="person-outline" size={24} color={colors.primary[600]} />
              </View>
              <View style={styles.instructorInfo}>
                <Text style={styles.instructorName}>
                  {instructorName || t('myLessons.instructorFallback')}
                </Text>
                <Text style={styles.instructorHint}>
                  Preference only, any instructor may approve
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setInstructorId(undefined)}
                style={styles.clearButton}
                activeOpacity={0.7}
                accessibilityLabel="Remove preferred instructor"
              >
                <Ionicons name="close-circle" size={22} color={colors.neutral[400]} />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.instructorCard}>
              <View style={styles.instructorIconContainer}>
                <Ionicons name="people-outline" size={24} color={colors.text.tertiary} />
              </View>
              <View style={styles.instructorInfo}>
                <Text style={styles.instructorName}>{t('book.noPreference')}</Text>
                <Text style={styles.instructorHint}>
                  Pick an instructor from the school page to set one
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Notes */}
        <View style={styles.section}>
          <Text style={styles.label}>{t('book.notes')}</Text>
          <TextInput
            style={styles.notesInput}
            placeholder={t('book.notesPlaceholder')}
            placeholderTextColor={colors.neutral[400]}
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitButton, loading && styles.disabledButton]}
          onPress={handleRequestLesson}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator size="small" color={colors.text.inverse} />
          ) : (
            <>
              <Text style={styles.submitButtonText}>{t('book.sendRequest')}</Text>
              <Ionicons name="send-outline" size={20} color={colors.text.inverse} />
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background.secondary,
    gap: spacing.md,
  },
  loadingText: {
    fontSize: typography.size.base,
    color: colors.text.secondary,
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
  content: {
    padding: spacing.xl,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: colors.primary[50],
    padding: spacing.base,
    borderRadius: 12,
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  infoContent: {
    flex: 1,
    gap: spacing.xs,
  },
  infoTitle: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
    color: colors.primary[600],
  },
  infoText: {
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
    gap: spacing.xs,
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
    marginBottom: spacing.sm,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.primary,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border.default,
    paddingHorizontal: spacing.base,
    height: 52,
    gap: spacing.sm,
  },
  dateButtonGrow: {
    flex: 1,
  },
  dateText: {
    fontSize: typography.size.base,
    color: colors.text.primary,
  },
  instructorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.primary,
    padding: spacing.base,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border.default,
    gap: spacing.md,
  },
  instructorIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  instructorInfo: {
    flex: 1,
    gap: 2,
  },
  instructorName: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
  },
  instructorHint: {
    fontSize: typography.size.xs,
    color: colors.text.tertiary,
  },
  clearButton: {
    padding: spacing.xs,
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
    marginBottom: spacing.sm,
  },
  helperText: {
    fontSize: typography.size.xs,
    color: colors.text.tertiary,
    fontStyle: 'italic',
  },
  submitButton: {
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
  submitButtonText: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.semibold,
    color: colors.text.inverse,
  },
  disabledButton: {
    opacity: 0.5,
  },
});
