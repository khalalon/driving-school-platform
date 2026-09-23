/**
 * Request Exam Screen - Minimal & Elegant
 * Single Responsibility: Request exam booking
 */

import React, { useState } from 'react';
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
import DateTimePicker from '@react-native-community/datetimepicker';
import { examService } from '../../services/api/ExamService';
import { getApiErrorMessage } from '../../services/api/ApiError';
import { useI18n } from '../../context/LanguageContext';
import { examTypeLabel, ExamType } from '../../models/Exam';
import { colors, typography, spacing, shadows } from '../../theme';
import { mirrorIcon } from '../../utils/rtl';

/** Demain à 9 h : première date proposée, dans le futur (exigé par X2). */
const defaultPreferredDate = (): Date => {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  date.setHours(9, 0, 0, 0);
  return date;
};

export const RequestExamScreen = ({ navigation }: any) => {
  const { t } = useI18n();
  const [loading, setLoading] = useState(false);
  const [examType, setExamType] = useState<ExamType>(ExamType.THEORY);
  const [date, setDate] = useState(defaultPreferredDate);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [time, setTime] = useState(defaultPreferredDate);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [message, setMessage] = useState('');

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setDate(selectedDate);
    }
  };

  const handleTimeChange = (event: any, selectedTime?: Date) => {
    setShowTimePicker(false);
    if (selectedTime) {
      setTime(selectedTime);
    }
  };

  const handleSubmit = async () => {
    if (!message.trim()) {
      Alert.alert(t('common.required'), t('requestExam.messageRequired'));
      return;
    }

    // Date et heure choisies, réunies en un instant
    const preferredDateTime = new Date(date);
    preferredDateTime.setHours(time.getHours(), time.getMinutes(), 0, 0);

    // X2 exige une date à venir : on le dit ici plutôt que de laisser remonter l'erreur du serveur
    if (preferredDateTime.getTime() <= Date.now()) {
      Alert.alert(t('book.invalidDate'), t('requestExam.dateMustBeFuture'));
      return;
    }

    try {
      setLoading(true);

      // X2 : vocabulaire du backend (theory | practical, D-18)
      await examService.requestExam({
        examType,
        preferredDate: preferredDateTime.toISOString(),
        message: message.trim(),
      });

      Alert.alert(t('school.requestSent'), t('requestExam.requestSentText'), [
        {
          text: 'OK',
          onPress: () => navigation.navigate('StudentTabs', { screen: 'MyExams' }),
        },
      ]);
    } catch (error) {
      Alert.alert(t('common.error'), getApiErrorMessage(error, t('requestExam.requestFailed')));
    } finally {
      setLoading(false);
    }
  };

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
        <Text style={styles.headerTitle}>Request Exam</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Info Card */}
        <View style={styles.infoCard}>
          <Ionicons name="information-circle-outline" size={24} color={colors.primary[600]} />
          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>{t('book.howItWorks')}</Text>
            <Text style={styles.infoText}>{t('requestExam.howItWorksText')}</Text>
          </View>
        </View>

        {/* Exam Type Selection */}
        <View style={styles.section}>
          <Text style={styles.label}>{t('requestExam.examType')}</Text>
          <View style={styles.typeContainer}>
            <TouchableOpacity
              style={[styles.typeButton, examType === ExamType.THEORY && styles.typeButtonActive]}
              onPress={() => setExamType(ExamType.THEORY)}
              activeOpacity={0.7}
            >
              <Ionicons
                name="book-outline"
                size={24}
                color={examType === ExamType.THEORY ? colors.text.inverse : colors.text.secondary}
              />
              <Text
                style={[
                  styles.typeButtonText,
                  examType === ExamType.THEORY && styles.typeButtonTextActive,
                ]}
              >
                {examTypeLabel(ExamType.THEORY)}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.typeButton,
                examType === ExamType.PRACTICAL && styles.typeButtonActive,
              ]}
              onPress={() => setExamType(ExamType.PRACTICAL)}
              activeOpacity={0.7}
            >
              <Ionicons
                name="car-sport-outline"
                size={24}
                color={
                  examType === ExamType.PRACTICAL ? colors.text.inverse : colors.text.secondary
                }
              />
              <Text
                style={[
                  styles.typeButtonText,
                  examType === ExamType.PRACTICAL && styles.typeButtonTextActive,
                ]}
              >
                {examTypeLabel(ExamType.PRACTICAL)}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Preferred Date */}
        <View style={styles.section}>
          <Text style={styles.label}>{t('requestExam.preferredDate')}</Text>
          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => setShowDatePicker(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="calendar-outline" size={20} color={colors.text.secondary} />
            <Text style={styles.dateText}>{date.toLocaleDateString()}</Text>
          </TouchableOpacity>
          {showDatePicker && (
            <DateTimePicker
              value={date}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onValueChange={handleDateChange}
              onDismiss={() => setShowDatePicker(false)}
              minimumDate={new Date()}
            />
          )}
          <Text style={styles.helperText}>{t('requestExam.dateHelper')}</Text>
        </View>

        {/* Preferred Time */}
        <View style={styles.section}>
          <Text style={styles.label}>{t('requestExam.preferredTime')}</Text>
          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => setShowTimePicker(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="time-outline" size={20} color={colors.text.secondary} />
            <Text style={styles.dateText}>
              {time.toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>
          </TouchableOpacity>
          {showTimePicker && (
            <DateTimePicker
              value={time}
              mode="time"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onValueChange={handleTimeChange}
              onDismiss={() => setShowTimePicker(false)}
            />
          )}
        </View>

        {/* Message */}
        <View style={styles.section}>
          <Text style={styles.label}>{t('requestExam.message')}</Text>
          <TextInput
            style={styles.messageInput}
            placeholder={t('requestExam.messagePlaceholder')}
            placeholderTextColor={colors.neutral[400]}
            value={message}
            onChangeText={setMessage}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
          <Text style={styles.helperText}>{t('requestExam.messageHelper')}</Text>
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitButton, loading && styles.disabledButton]}
          onPress={handleSubmit}
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
    gap: spacing.md,
  },
  typeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.base,
    borderRadius: 12,
    gap: spacing.sm,
    backgroundColor: colors.background.primary,
    borderWidth: 2,
    borderColor: colors.border.default,
  },
  typeButtonActive: {
    backgroundColor: colors.primary[600],
    borderColor: colors.primary[600],
  },
  typeButtonText: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.semibold,
    color: colors.text.secondary,
  },
  typeButtonTextActive: {
    color: colors.text.inverse,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.primary,
    padding: spacing.base,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border.default,
    gap: spacing.md,
    height: 52,
    marginBottom: spacing.sm,
  },
  dateText: {
    fontSize: typography.size.base,
    color: colors.text.primary,
  },
  helperText: {
    fontSize: typography.size.xs,
    color: colors.text.tertiary,
    fontStyle: 'italic',
  },
  messageInput: {
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
