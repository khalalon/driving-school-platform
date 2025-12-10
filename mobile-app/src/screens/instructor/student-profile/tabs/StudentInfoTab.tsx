/**
 * Student Info Tab - Profile & Financial Info
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  TextInput,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  studentProfileService,
  StudentProfile,
  FinancialSummary,
} from '../../../../services/api/StudentProfileService';
import { colors, typography, spacing, shadows } from '../../../../theme';

export const StudentInfoTab = ({ route }: any) => {
  const { studentId, schoolId } = route.params;

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [financial, setFinancial] = useState<FinancialSummary | null>(null);
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [notes, setNotes] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [profileData, financialData] = await Promise.all([
        studentProfileService.getCompleteProfile(studentId, schoolId),
        studentProfileService.getFinancialSummary(studentId, schoolId),
      ]);
      setProfile(profileData);
      setFinancial(financialData);
      setNotes(profileData.notes || '');
    } catch (error: any) {
      Alert.alert('Error', 'Failed to load student profile');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveNotes = async () => {
    try {
      setSavingNotes(true);
      await studentProfileService.updateNotes(studentId, notes);
      Alert.alert('Success', 'Notes updated successfully');
      setShowNotesModal(false);
      loadData();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to update notes');
    } finally {
      setSavingNotes(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary[600]} />
      </View>
    );
  }

  if (!profile || !financial) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Profile not found</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Profile Card */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="person-circle-outline" size={24} color={colors.primary[600]} />
          <Text style={styles.cardTitle}>Personal Information</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Email</Text>
          <Text style={styles.infoValue}>{profile.email}</Text>
        </View>

        {profile.phone && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Phone</Text>
            <Text style={styles.infoValue}>{profile.phone}</Text>
          </View>
        )}

        {profile.address && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Address</Text>
            <Text style={styles.infoValue}>{profile.address}</Text>
          </View>
        )}

        {profile.dateOfBirth && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Date of Birth</Text>
            <Text style={styles.infoValue}>
              {new Date(profile.dateOfBirth).toLocaleDateString()}
            </Text>
          </View>
        )}

        {profile.licenseNumber && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>License Number</Text>
            <Text style={styles.infoValue}>{profile.licenseNumber}</Text>
          </View>
        )}

        {profile.enrollmentDate && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Enrollment Date</Text>
            <Text style={styles.infoValue}>
              {new Date(profile.enrollmentDate).toLocaleDateString()}
            </Text>
          </View>
        )}
      </View>

      {/* Emergency Contact */}
      {(profile.emergencyContact || profile.emergencyPhone) && (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="call-outline" size={24} color={colors.error[600]} />
            <Text style={styles.cardTitle}>Emergency Contact</Text>
          </View>

          {profile.emergencyContact && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Name</Text>
              <Text style={styles.infoValue}>{profile.emergencyContact}</Text>
            </View>
          )}

          {profile.emergencyPhone && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Phone</Text>
              <Text style={styles.infoValue}>{profile.emergencyPhone}</Text>
            </View>
          )}
        </View>
      )}

      {/* Progress Stats */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="bar-chart-outline" size={24} color={colors.primary[600]} />
          <Text style={styles.cardTitle}>Progress</Text>
        </View>

        <View style={styles.statsGrid}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{profile.totalLessons}</Text>
            <Text style={styles.statLabel}>Total Lessons</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statValue, { color: colors.success[600] }]}>
              {profile.completedLessons}
            </Text>
            <Text style={styles.statLabel}>Completed</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{profile.totalExams}</Text>
            <Text style={styles.statLabel}>Exams</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statValue, { color: colors.success[600] }]}>
              {profile.passedExams}
            </Text>
            <Text style={styles.statLabel}>Passed</Text>
          </View>
        </View>
      </View>

      {/* Financial Summary */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="cash-outline" size={24} color={colors.success[600]} />
          <Text style={styles.cardTitle}>Financial Summary</Text>
        </View>

        <View style={styles.financialRow}>
          <Text style={styles.financialLabel}>Total Revenue</Text>
          <Text style={[styles.financialValue, { color: colors.success[600] }]}>
            €{financial.totalRevenue.toFixed(2)}
          </Text>
        </View>

        <View style={styles.financialRow}>
          <Text style={styles.financialLabel}>Pending Payment</Text>
          <Text style={[styles.financialValue, { color: colors.warning[600] }]}>
            €{financial.totalPending.toFixed(2)}
          </Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.financialRow}>
          <Text style={styles.financialLabel}>Lessons Revenue</Text>
          <Text style={styles.financialValue}>€{financial.lessonsRevenue.toFixed(2)}</Text>
        </View>

        <View style={styles.financialRow}>
          <Text style={styles.financialLabel}>Lessons Pending</Text>
          <Text style={styles.financialValue}>€{financial.lessonsPending.toFixed(2)}</Text>
        </View>

        <View style={styles.financialRow}>
          <Text style={styles.financialLabel}>Exams Revenue</Text>
          <Text style={styles.financialValue}>€{financial.examsRevenue.toFixed(2)}</Text>
        </View>

        <View style={styles.financialRow}>
          <Text style={styles.financialLabel}>Exams Pending</Text>
          <Text style={styles.financialValue}>€{financial.examsPending.toFixed(2)}</Text>
        </View>

        {financial.lastPaymentDate && (
          <View style={styles.lastPayment}>
            <Text style={styles.lastPaymentText}>
              Last payment: {new Date(financial.lastPaymentDate).toLocaleDateString()}
            </Text>
          </View>
        )}
      </View>

      {/* Instructor Notes */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="document-text-outline" size={24} color={colors.primary[600]} />
          <Text style={styles.cardTitle}>Instructor Notes</Text>
        </View>

        {profile.notes ? (
          <Text style={styles.notesText}>{profile.notes}</Text>
        ) : (
          <Text style={styles.noNotesText}>No notes added yet</Text>
        )}

        <TouchableOpacity
          style={styles.editButton}
          onPress={() => setShowNotesModal(true)}
          activeOpacity={0.7}
        >
          <Ionicons name="create-outline" size={20} color={colors.text.inverse} />
          <Text style={styles.editButtonText}>Edit Notes</Text>
        </TouchableOpacity>
      </View>

      {/* Notes Modal */}
      <Modal
        visible={showNotesModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowNotesModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Instructor Notes</Text>
              <TouchableOpacity onPress={() => setShowNotesModal(false)} activeOpacity={0.7}>
                <Ionicons name="close" size={24} color={colors.text.secondary} />
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.notesInput}
              placeholder="Add private notes about this student..."
              placeholderTextColor={colors.neutral[400]}
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={8}
              textAlignVertical="top"
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowNotesModal(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={handleSaveNotes}
                disabled={savingNotes}
                activeOpacity={0.7}
              >
                {savingNotes ? (
                  <ActivityIndicator size="small" color={colors.text.inverse} />
                ) : (
                  <Text style={styles.saveButtonText}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
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
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: typography.size.base,
    color: colors.text.secondary,
  },
  card: {
    backgroundColor: colors.background.primary,
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    borderRadius: 12,
    padding: spacing.md,
    ...shadows.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  cardTitle: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
    marginLeft: spacing.sm,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[200],
  },
  infoLabel: {
    fontSize: typography.size.base,
    color: colors.text.secondary,
  },
  infoValue: {
    fontSize: typography.size.base,
    color: colors.text.primary,
    fontWeight: typography.weight.medium,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  statBox: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: colors.background.secondary,
    borderRadius: 8,
    padding: spacing.md,
    alignItems: 'center',
  },
  statValue: {
    fontSize: typography.size['2xl'],
    fontWeight: typography.weight.bold,
    color: colors.primary[600],
  },
  statLabel: {
    fontSize: typography.size.sm,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  financialRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  financialLabel: {
    fontSize: typography.size.base,
    color: colors.text.secondary,
  },
  financialValue: {
    fontSize: typography.size.base,
    color: colors.text.primary,
    fontWeight: typography.weight.semibold,
  },
  divider: {
    height: 1,
    backgroundColor: colors.neutral[200],
    marginVertical: spacing.sm,
  },
  lastPayment: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.neutral[200],
  },
  lastPaymentText: {
    fontSize: typography.size.sm,
    color: colors.text.secondary,
    fontStyle: 'italic',
  },
  notesText: {
    fontSize: typography.size.base,
    color: colors.text.primary,
    lineHeight: typography.lineHeight.relaxed * typography.size.base,
    marginBottom: spacing.md,
  },
  noNotesText: {
    fontSize: typography.size.base,
    color: colors.text.secondary,
    fontStyle: 'italic',
    marginBottom: spacing.md,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary[600],
    borderRadius: 8,
    paddingVertical: spacing.sm,
    gap: spacing.xs,
  },
  editButtonText: {
    fontSize: typography.size.base,
    color: colors.text.inverse,
    fontWeight: typography.weight.semibold,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.background.primary,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: spacing.lg,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  modalTitle: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
  },
  notesInput: {
    fontSize: typography.size.base,
    backgroundColor: colors.background.secondary,
    borderRadius: 8,
    padding: spacing.md,
    minHeight: 150,
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  modalButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: colors.background.secondary,
  },
  saveButton: {
    backgroundColor: colors.primary[600],
  },
  cancelButtonText: {
    fontSize: typography.size.base,
    color: colors.text.primary,
    fontWeight: typography.weight.semibold,
  },
  saveButtonText: {
    fontSize: typography.size.base,
    color: colors.text.inverse,
    fontWeight: typography.weight.semibold,
  },
});
