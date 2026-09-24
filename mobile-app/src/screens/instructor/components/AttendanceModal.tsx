/**
 * Présence d'une leçon (L7), partagée par `TodayLessonsScreen` et l'accueil « Aujourd'hui » (8.3),
 * refondue sur le système (11.4). Une leçon = un élève (D-34) ; la note n'a de sens que si l'élève
 * était présent (D-33). L'appel réseau reste dans l'écran appelant.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { lessonTypeLabel, Lesson, MarkAttendanceData } from '../../../models/Lesson';
import { formatPersonName, formatTime } from '../../../utils/format';
import { useI18n } from '../../../context/LanguageContext';
import { useTheme } from '../../../context/ThemeContext';
import { Button, Card, Field } from '../../../components/ui';
import { Theme } from '../../../theme';

const RATINGS = [1, 2, 3, 4, 5];

interface AttendanceModalProps {
  /** Leçon à pointer ; `null` = modale fermée. */
  lesson: Lesson | null;
  /** Choix pré-sélectionné à l'ouverture (bouton « Présent » ou « Absent » de la carte). */
  initialAttended?: boolean;
  processing: boolean;
  onClose: () => void;
  onConfirm: (data: MarkAttendanceData) => void;
}

export const AttendanceModal = ({
  lesson,
  initialAttended = true,
  processing,
  onClose,
  onConfirm,
}: AttendanceModalProps) => {
  const { t } = useI18n();
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [attended, setAttended] = useState(initialAttended);
  const [feedback, setFeedback] = useState('');
  const [rating, setRating] = useState<number | null>(null);

  // Remise à zéro à chaque ouverture
  useEffect(() => {
    if (lesson) {
      setAttended(initialAttended);
      setFeedback('');
      setRating(null);
    }
  }, [lesson, initialAttended]);

  const confirm = () =>
    onConfirm({
      attended,
      feedback: feedback.trim() || undefined,
      rating: attended && rating !== null ? rating : undefined,
    });

  return (
    <Modal visible={lesson !== null} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Card style={styles.modal}>
          <View style={styles.header}>
            <Text style={styles.title}>{t('attendance.title')}</Text>
            <Pressable
              onPress={onClose}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel={t('common.close')}
            >
              <Ionicons name="close" size={22} color={theme.colors.textSecondary} />
            </Pressable>
          </View>

          <Text style={styles.subtitle}>
            {lesson
              ? t('attendance.subtitle', {
                  type: lessonTypeLabel(lesson.type),
                  student: formatPersonName(lesson.student, t('attendance.theStudent')),
                  time: formatTime(lesson.scheduledDate),
                })
              : ''}
          </Text>

          <View style={styles.section}>
            <Text style={styles.label}>{t('attendance.question')}</Text>
            <View style={styles.choices}>
              <Pressable
                onPress={() => setAttended(true)}
                accessibilityRole="button"
                accessibilityState={{ selected: attended }}
                style={[styles.choice, attended && styles.choicePresent]}
              >
                <Ionicons
                  name="checkmark-circle"
                  size={24}
                  color={attended ? theme.colors.successText : theme.colors.textMuted}
                />
                <Text style={[styles.choiceText, attended && styles.choiceTextPresent]}>
                  {t('today.present')}
                </Text>
              </Pressable>

              <Pressable
                onPress={() => setAttended(false)}
                accessibilityRole="button"
                accessibilityState={{ selected: !attended }}
                style={[styles.choice, !attended && styles.choiceAbsent]}
              >
                <Ionicons
                  name="close-circle"
                  size={24}
                  color={!attended ? theme.colors.dangerText : theme.colors.textMuted}
                />
                <Text style={[styles.choiceText, !attended && styles.choiceTextAbsent]}>
                  {t('today.absent')}
                </Text>
              </Pressable>
            </View>
          </View>

          {/* La note ne s'applique qu'à un élève présent (D-33) */}
          {attended ? (
            <View style={styles.section}>
              <Text style={styles.label}>{t('attendance.rating')}</Text>
              <View style={styles.ratingRow}>
                {RATINGS.map((star) => (
                  <Pressable
                    key={star}
                    onPress={() => setRating(rating === star ? null : star)}
                    accessibilityRole="button"
                    accessibilityLabel={`${star}`}
                    style={styles.star}
                  >
                    <Ionicons
                      name={rating !== null && star <= rating ? 'star' : 'star-outline'}
                      size={28}
                      color={theme.colors.warning}
                    />
                  </Pressable>
                ))}
              </View>
            </View>
          ) : null}

          <Field
            label={t('attendance.feedback')}
            placeholder={t('attendance.feedbackPlaceholder')}
            value={feedback}
            onChangeText={setFeedback}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
            style={styles.feedback}
          />

          <View style={styles.actions}>
            <Button
              title={t('common.cancel')}
              onPress={onClose}
              variant="secondary"
              style={styles.action}
            />
            <Button
              title={t('common.save')}
              onPress={confirm}
              loading={processing}
              style={styles.action}
            />
          </View>
        </Card>
      </View>
    </Modal>
  );
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: theme.colors.overlay,
      justifyContent: 'center',
      padding: theme.spacing.lg,
    },
    modal: { gap: theme.spacing.md },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    title: {
      fontSize: theme.typography.size.lg,
      fontWeight: theme.typography.weight.bold,
      color: theme.colors.textPrimary,
    },
    subtitle: { fontSize: theme.typography.size.sm, color: theme.colors.textSecondary },
    section: { gap: theme.spacing.sm },
    label: {
      fontSize: theme.typography.size.sm,
      fontWeight: theme.typography.weight.medium,
      color: theme.colors.textSecondary,
    },
    choices: { flexDirection: 'row', gap: theme.spacing.md },
    choice: {
      flex: 1,
      alignItems: 'center',
      gap: theme.spacing.xs,
      paddingVertical: theme.spacing.md,
      borderRadius: theme.radius.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surfaceMuted,
    },
    choicePresent: {
      borderColor: theme.colors.success,
      backgroundColor: theme.colors.successSoft,
    },
    choiceAbsent: { borderColor: theme.colors.danger, backgroundColor: theme.colors.dangerSoft },
    choiceText: {
      fontSize: theme.typography.size.sm,
      fontWeight: theme.typography.weight.medium,
      color: theme.colors.textSecondary,
    },
    choiceTextPresent: { color: theme.colors.successText },
    choiceTextAbsent: { color: theme.colors.dangerText },
    ratingRow: { flexDirection: 'row', gap: theme.spacing.sm },
    star: { padding: theme.spacing.xs },
    feedback: { minHeight: 72 },
    actions: { flexDirection: 'row', gap: theme.spacing.md },
    action: { flex: 1 },
  });
