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
import { studentProfileService } from '../../../../services/api/StudentProfileService';
import { getApiErrorMessage } from '../../../../services/api/ApiError';
import { FinancialSummary, StudentProfile } from '../../../../models/Profile';
import { useSchoolCurrency } from '../../../../hooks/useSchoolCurrency';
import { formatAmount, formatDate, formatPersonName } from '../../../../utils/format';
import { colors, typography, spacing, shadows } from '../../../../theme';
import { useI18n } from '../../../../context/LanguageContext';

export const StudentInfoTab = ({ route }: any) => {
  const { t } = useI18n();
  const { studentId, schoolId } = route.params;
  const currency = useSchoolCurrency(schoolId);

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
    } catch (error) {
      Alert.alert(t('common.error'), getApiErrorMessage(error, t('studentInfo.loadFailed')));
    } finally {
      setLoading(false);
    }
  };

  const handleSaveNotes = async () => {
    try {
      setSavingNotes(true);
      await studentProfileService.updateNotes(studentId, notes);
      Alert.alert(t('common.success'), t('studentInfo.notesSaved'));
      setShowNotesModal(false);
      loadData();
    } catch (error) {
      Alert.alert(t('common.error'), getApiErrorMessage(error, t('studentInfo.notesFailed')));
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
        <Text style={styles.errorText}>{t('studentInfo.notFound')}</Text>
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
          <Text style={styles.infoLabel}>{t('studentInfo.name')}</Text>
          <Text style={styles.infoValue}>{formatPersonName(profile)}</Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>{t('studentInfo.email')}</Text>
          <Text style={styles.infoValue}>{profile.email}</Text>
        </View>

        {profile.phone && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{t('studentInfo.phone')}</Text>
            <Text style={styles.infoValue}>{profile.phone}</Text>
          </View>
        )}

        {profile.address && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{t('studentInfo.address')}</Text>
            <Text style={styles.infoValue}>{profile.address}</Text>
          </View>
        )}

        {profile.dateOfBirth && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{t('studentInfo.dateOfBirth')}</Text>
            <Text style={styles.infoValue}>{formatDate(profile.dateOfBirth)}</Text>
          </View>
        )}

        {profile.licenseNumber && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{t('studentInfo.licenseNumber')}</Text>
            <Text style={styles.infoValue}>{profile.licenseNumber}</Text>
          </View>
        )}

        {profile.enrollmentDate && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{t('studentInfo.enrollmentDate')}</Text>
            <Text style={styles.infoValue}>{formatDate(profile.enrollmentDate)}</Text>
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
              <Text style={styles.infoLabel}>{t('studentInfo.name')}</Text>
              <Text style={styles.infoValue}>{profile.emergencyContact}</Text>
            </View>
          )}

          {profile.emergencyPhone && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>{t('studentInfo.phone')}</Text>
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
            <Text style={styles.statLabel}>{t('studentInfo.totalLessons')}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statValue, { color: colors.success[600] }]}>
              {profile.completedLessons}
            </Text>
            <Text style={styles.statLabel}>{t('studentInfo.completed')}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{profile.totalExams}</Text>
            <Text style={styles.statLabel}>{t('studentInfo.exams')}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statValue, { color: colors.success[600] }]}>
              {profile.passedExams}
            </Text>
            <Text style={styles.statLabel}>{t('studentInfo.passed')}</Text>
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
          <Text style={styles.financialLabel}>{t('studentInfo.totalRevenue')}</Text>
          <Text style={[styles.financialValue, { color: colors.success[600] }]}>
            {formatAmount(financial.totalRevenue, currency)}
          </Text>
        </View>

        <View style={styles.financialRow}>
          <Text style={styles.financialLabel}>{t('studentInfo.pendingPayment')}</Text>
          <Text style={[styles.financialValue, { color: colors.warning[600] }]}>
            {formatAmount(financial.totalPending, currency)}
          </Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.financialRow}>
          <Text style={styles.financialLabel}>{t('studentInfo.lessonsRevenue')}</Text>
          <Text style={styles.financialValue}>
            {formatAmount(financial.lessonsRevenue, currency)}
          </Text>
        </View>

        <View style={styles.financialRow}>
          <Text style={styles.financialLabel}>{t('studentInfo.lessonsPending')}</Text>
          <Text style={styles.financialValue}>
            {formatAmount(financial.lessonsPending, currency)}
          </Text>
        </View>

        <View style={styles.financialRow}>
          <Text style={styles.financialLabel}>{t('studentInfo.examsRevenue')}</Text>
          <Text style={styles.financialValue}>
            {formatAmount(financial.examsRevenue, currency)}
          </Text>
        </View>

        <View style={styles.financialRow}>
          <Text style={styles.financialLabel}>{t('studentInfo.examsPending')}</Text>
          <Text style={styles.financialValue}>
            {formatAmount(financial.examsPending, currency)}
          </Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.financialRow}>
          <Text style={styles.financialLabel}>{t('studentInfo.creditAvailable')}</Text>
          <Text style={[styles.financialValue, { color: colors.primary[600] }]}>
            {formatAmount(financial.credit, currency)}
          </Text>
        </View>

        {financial.lastPaymentDate && (
          <View style={styles.lastPayment}>
            <Text style={styles.lastPaymentText}>
              Last payment: {formatDate(financial.lastPaymentDate)}
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
          <Text style={styles.noNotesText}>{t('studentInfo.noNotes')}</Text>
        )}

        <TouchableOpacity
          style={styles.editButton}
          onPress={() => setShowNotesModal(true)}
          activeOpacity={0.7}
        >
          <Ionicons name="create-outline" size={20} color={colors.text.inverse} />
          <Text style={styles.editButtonText}>{t('studentInfo.editNotes')}</Text>
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
              <Text style={styles.modalTitle}>{t('studentInfo.notesTitle')}</Text>
              <TouchableOpacity onPress={() => setShowNotesModal(false)} activeOpacity={0.7}>
                <Ionicons name="close" size={24} color={colors.text.secondary} />
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.notesInput}
              placeholder={t('studentInfo.notesPlaceholder')}
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
                <Text style={styles.cancelButtonText}>{t('common.cancel')}</Text>
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
                  <Text style={styles.saveButtonText}>{t('common.save')}</Text>
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
