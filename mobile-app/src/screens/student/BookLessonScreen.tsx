/**
 * Book Lesson Screen - Minimal & Elegant
 * Single Responsibility: Student requests lesson booking with enrollment check
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import { lessonService } from '../../services/api/LessonService';
import { enrollmentService } from '../../services/api/EnrollmentService';
import { LessonType } from '../../models/Lesson';
import { colors, typography, spacing, shadows } from '../../theme';

export const BookLessonScreen = ({ navigation, route }: any) => {
  const { schoolId, instructorId, instructorName } = route.params;
  
  const [loading, setLoading] = useState(false);
  const [checkingEnrollment, setCheckingEnrollment] = useState(true);
  const [canBook, setCanBook] = useState(false);
  
  const [lessonType, setLessonType] = useState<LessonType>(LessonType.PRACTICAL);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    checkEnrollmentStatus();
  }, []);

  const checkEnrollmentStatus = async () => {
    try {
      setCheckingEnrollment(true);
      const status = await enrollmentService.checkEnrollmentStatus(schoolId);
      
      if (!status.canBook) {
        Alert.alert(
          'Enrollment Required',
          'You must be enrolled in this school to request lessons.',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      }
      
      setCanBook(status.canBook);
    } catch (error: any) {
      Alert.alert('Error', 'Failed to check enrollment status');
      navigation.goBack();
    } finally {
      setCheckingEnrollment(false);
    }
  };

  const handleRequestLesson = async () => {
    try {
      setLoading(true);

      // Student requests a lesson - instructor will approve and schedule later
      await lessonService.requestLesson({
        instructorId,
        type: lessonType,
        notes: notes.trim() || undefined,
      });

      Alert.alert(
        'Request Sent!',
        'Your lesson request has been submitted. The instructor will review and schedule it soon.',
        [{ text: 'OK', onPress: () => navigation.navigate('MyLessons') }]
      );
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to request lesson');
    } finally {
      setLoading(false);
    }
  };

  if (checkingEnrollment) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary[600]} />
        <Text style={styles.loadingText}>Checking enrollment...</Text>
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
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Request Lesson</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Info Card */}
        <View style={styles.infoCard}>
          <Ionicons name="information-circle-outline" size={24} color={colors.primary[600]} />
          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>How it works</Text>
            <Text style={styles.infoText}>
              Submit your lesson request. The instructor will review, approve, and schedule a specific date and time for you.
            </Text>
          </View>
        </View>

        {/* Instructor Info */}
        {instructorName && (
          <View style={styles.instructorCard}>
            <View style={styles.instructorIconContainer}>
              <Ionicons name="person-outline" size={28} color={colors.primary[600]} />
            </View>
            <View>
              <Text style={styles.instructorLabel}>Instructor</Text>
              <Text style={styles.instructorName}>{instructorName}</Text>
            </View>
          </View>
        )}

        {/* Lesson Type */}
        <View style={styles.section}>
          <Text style={styles.label}>Lesson Type</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={lessonType}
              onValueChange={(value) => setLessonType(value)}
              style={styles.picker}
            >
              <Picker.Item label="Practical Driving" value={LessonType.PRACTICAL} />
              <Picker.Item label="Theory" value={LessonType.THEORY} />
            </Picker>
          </View>
        </View>

        {/* Notes */}
        <View style={styles.section}>
          <Text style={styles.label}>Additional Notes (Optional)</Text>
          <TextInput
            style={styles.notesInput}
            placeholder="Preferred times, special requests, etc..."
            placeholderTextColor={colors.neutral[400]}
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
          <Text style={styles.helperText}>
            The instructor will contact you to confirm the date and time
          </Text>
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
              <Text style={styles.submitButtonText}>Send Request</Text>
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
  instructorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.primary,
    padding: spacing.lg,
    borderRadius: 12,
    gap: spacing.md,
    marginBottom: spacing.xl,
    ...shadows.sm,
  },
  instructorIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  instructorLabel: {
    fontSize: typography.size.xs,
    color: colors.text.tertiary,
    textTransform: 'uppercase',
    marginBottom: spacing.xs,
  },
  instructorName: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
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
  pickerContainer: {
    backgroundColor: colors.background.primary,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  picker: {
    height: 52,
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