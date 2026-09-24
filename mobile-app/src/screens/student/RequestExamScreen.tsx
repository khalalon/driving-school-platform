/**
 * Demander un examen (11.3) — X2 : type (theory | practical, D-18), date et heure souhaitées,
 * message pour l'école. La suite dépend du type (D-42), ce que l'écran « Mes examens » raconte.
 */

import React, { useState, useMemo } from 'react';
import { Alert, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { examService } from '../../services/api/ExamService';
import { getApiErrorMessage } from '../../services/api/ApiError';
import { useI18n } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
import { AppBar, Button, Card, Chip, Field, Screen } from '../../components/ui';
import { examTypeLabel, ExamType } from '../../models/Exam';
import { Theme } from '../../theme';

/** Demain à 9 h : première date proposée, dans le futur (exigé par X2). */
const defaultPreferredDate = (): Date => {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  date.setHours(9, 0, 0, 0);
  return date;
};

export const RequestExamScreen = ({ navigation }: any) => {
  const { t } = useI18n();
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [loading, setLoading] = useState(false);
  const [examType, setExamType] = useState<ExamType>(ExamType.THEORY);
  const [date, setDate] = useState(defaultPreferredDate);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [time, setTime] = useState(defaultPreferredDate);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [message, setMessage] = useState('');

  const handleDateChange = (_event: unknown, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) setDate(selectedDate);
  };

  const handleTimeChange = (_event: unknown, selectedTime?: Date) => {
    setShowTimePicker(false);
    if (selectedTime) setTime(selectedTime);
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
          text: t('common.ok'),
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
    <View style={styles.flex}>
      <AppBar
        title={t('requestExam.title')}
        onBack={() => navigation.goBack()}
        backLabel={t('common.back')}
      />

      <Screen contentContainerStyle={styles.content} edges={[]}>
        <Card highlighted elevation="none" style={styles.info}>
          <Ionicons name="information-circle" size={22} color={theme.colors.accentText} />
          <View style={styles.infoBody}>
            <Text style={styles.infoTitle}>{t('book.howItWorks')}</Text>
            <Text style={styles.infoText}>{t('requestExam.howItWorksText')}</Text>
          </View>
        </Card>

        <View style={styles.section}>
          <Text style={styles.label}>{t('requestExam.examType')}</Text>
          <View style={styles.types}>
            <Chip
              label={examTypeLabel(ExamType.THEORY)}
              icon="book-outline"
              selected={examType === ExamType.THEORY}
              onPress={() => setExamType(ExamType.THEORY)}
            />
            <Chip
              label={examTypeLabel(ExamType.PRACTICAL)}
              icon="car-sport-outline"
              selected={examType === ExamType.PRACTICAL}
              onPress={() => setExamType(ExamType.PRACTICAL)}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>{t('requestExam.preferredDate')}</Text>
          <View style={styles.dateRow}>
            <Pressable
              onPress={() => setShowDatePicker(true)}
              accessibilityRole="button"
              style={({ pressed }) => [styles.dateButton, styles.grow, pressed && styles.pressed]}
            >
              <Ionicons name="calendar-outline" size={20} color={theme.colors.textSecondary} />
              <Text style={styles.dateText}>{date.toLocaleDateString()}</Text>
            </Pressable>
            <Pressable
              onPress={() => setShowTimePicker(true)}
              accessibilityRole="button"
              style={({ pressed }) => [styles.dateButton, pressed && styles.pressed]}
            >
              <Ionicons name="time-outline" size={20} color={theme.colors.textSecondary} />
              <Text style={styles.dateText}>
                {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </Pressable>
          </View>
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
          {showTimePicker && (
            <DateTimePicker
              value={time}
              mode="time"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onValueChange={handleTimeChange}
              onDismiss={() => setShowTimePicker(false)}
            />
          )}
          <Text style={styles.helper}>{t('requestExam.dateHelper')}</Text>
        </View>

        <Field
          label={t('requestExam.message')}
          placeholder={t('requestExam.messagePlaceholder')}
          hint={t('requestExam.messageHelper')}
          value={message}
          onChangeText={setMessage}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
          style={styles.message}
        />

        <Button
          title={t('book.sendRequest')}
          onPress={handleSubmit}
          loading={loading}
          icon="send"
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
    infoBody: { flex: 1, gap: 2 },
    infoTitle: {
      fontSize: theme.typography.size.sm,
      fontWeight: theme.typography.weight.semibold,
      color: theme.colors.accentText,
    },
    infoText: { fontSize: theme.typography.size.sm, color: theme.colors.accentText },
    section: { gap: theme.spacing.sm },
    label: {
      fontSize: theme.typography.size.sm,
      fontWeight: theme.typography.weight.medium,
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
    dateText: { fontSize: theme.typography.size.base, color: theme.colors.textPrimary },
    helper: { fontSize: theme.typography.size.xs, color: theme.colors.textMuted },
    message: { minHeight: 96 },
    submit: { marginTop: theme.spacing.sm },
  });
