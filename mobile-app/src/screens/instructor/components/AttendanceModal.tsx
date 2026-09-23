/**
 * Attendance Modal — présence d'une leçon (L7), partagée par `TodayLessonsScreen` et
 * l'accueil « Today » (8.3). Une leçon = un élève (D-34) ; la note n'a de sens que si l'élève
 * était présent (D-33). L'appel réseau reste dans l'écran appelant.
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { lessonTypeLabel, Lesson, MarkAttendanceData } from '../../../models/Lesson';
import { formatPersonName, formatTime } from '../../../utils/format';
import { colors, typography, spacing, shadows } from '../../../theme';

const RATINGS = [1, 2, 3, 4, 5];

interface AttendanceModalProps {
  /** Leçon à pointer ; `null` = modale fermée. */
  lesson: Lesson | null;
  /** Choix pré-sélectionné à l'ouverture (bouton « Present » ou « Absent » de la carte). */
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
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Record Attendance</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={colors.text.secondary} />
            </TouchableOpacity>
          </View>

          <Text style={styles.modalSubtitle}>
            {lesson
              ? `${lessonTypeLabel(lesson.type)} lesson with ${formatPersonName(
                  lesson.student,
                  'the student'
                )} at ${formatTime(lesson.scheduledDate)}`
              : ''}
          </Text>

          <View style={styles.section}>
            <Text style={styles.label}>Was the student present?</Text>
            <View style={styles.choiceRow}>
              <TouchableOpacity
                style={[styles.choiceButton, attended && styles.choicePresent]}
                onPress={() => setAttended(true)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name="checkmark-circle"
                  size={24}
                  color={attended ? colors.success[600] : colors.text.tertiary}
                />
                <Text style={[styles.choiceText, attended && styles.choiceTextActive]}>
                  Present
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.choiceButton, !attended && styles.choiceAbsent]}
                onPress={() => setAttended(false)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name="close-circle"
                  size={24}
                  color={!attended ? colors.error[600] : colors.text.tertiary}
                />
                <Text style={[styles.choiceText, !attended && styles.choiceTextActive]}>
                  Absent
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {attended && (
            <View style={styles.section}>
              <Text style={styles.label}>Rating (optional)</Text>
              <View style={styles.ratingRow}>
                {RATINGS.map((star) => (
                  <TouchableOpacity
                    key={star}
                    onPress={() => setRating(rating === star ? null : star)}
                    activeOpacity={0.7}
                    style={styles.starButton}
                  >
                    <Ionicons
                      name={rating !== null && star <= rating ? 'star' : 'star-outline'}
                      size={28}
                      color={colors.warning[500]}
                    />
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          <View style={styles.section}>
            <Text style={styles.label}>Feedback (optional)</Text>
            <TextInput
              style={styles.feedbackInput}
              placeholder="Progress, points to work on..."
              placeholderTextColor={colors.neutral[400]}
              value={feedback}
              onChangeText={setFeedback}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>

          <View style={styles.modalActions}>
            <TouchableOpacity
              style={[styles.modalButton, styles.modalCancelButton]}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.modalButton,
                styles.modalConfirmButton,
                processing && styles.disabledButton,
              ]}
              onPress={confirm}
              disabled={processing}
              activeOpacity={0.7}
            >
              {processing ? (
                <ActivityIndicator size="small" color={colors.text.inverse} />
              ) : (
                <Text style={styles.modalConfirmText}>Save</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  modalContent: {
    backgroundColor: colors.background.primary,
    borderRadius: 16,
    padding: spacing.xl,
    ...shadows.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  modalTitle: {
    fontSize: typography.size.xl,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
  },
  modalSubtitle: {
    fontSize: typography.size.sm,
    color: colors.text.secondary,
    marginBottom: spacing.lg,
  },
  section: {
    marginBottom: spacing.lg,
  },
  label: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.medium,
    color: colors.text.primary,
    marginBottom: spacing.sm,
  },
  choiceRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  choiceButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border.default,
    backgroundColor: colors.background.secondary,
  },
  choicePresent: {
    borderColor: colors.success[500],
    backgroundColor: colors.success[50],
  },
  choiceAbsent: {
    borderColor: colors.error[500],
    backgroundColor: colors.error[50],
  },
  choiceText: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.medium,
    color: colors.text.secondary,
  },
  choiceTextActive: {
    color: colors.text.primary,
  },
  ratingRow: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  starButton: {
    padding: spacing.xs,
  },
  feedbackInput: {
    backgroundColor: colors.background.secondary,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border.default,
    padding: spacing.base,
    fontSize: typography.size.base,
    color: colors.text.primary,
    minHeight: 80,
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  modalButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelButton: {
    backgroundColor: colors.background.tertiary,
  },
  modalCancelText: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.semibold,
    color: colors.text.secondary,
  },
  modalConfirmButton: {
    backgroundColor: colors.success[600],
  },
  modalConfirmText: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.semibold,
    color: colors.text.inverse,
  },
  disabledButton: {
    opacity: 0.5,
  },
});
