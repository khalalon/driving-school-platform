/**
 * Onglet « Informations » de la fiche élève (11.4) — P1, P2 et P7 : état civil, contact
 * d'urgence, progression, situation financière (avoir compris, D-40) et notes de l'instructeur.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Alert, Modal, StyleSheet, Text, View } from 'react-native';
import { studentProfileService } from '../../../../services/api/StudentProfileService';
import { getApiErrorMessage } from '../../../../services/api/ApiError';
import { FinancialSummary, StudentProfile } from '../../../../models/Profile';
import { useSchoolCurrency } from '../../../../hooks/useSchoolCurrency';
import { formatAmount, formatDate, formatPersonName } from '../../../../utils/format';
import { useI18n } from '../../../../context/LanguageContext';
import { useTheme } from '../../../../context/ThemeContext';
import {
  Button,
  Card,
  EmptyState,
  Field,
  Screen,
  SectionHeader,
  SkeletonCard,
} from '../../../../components/ui';
import { Theme } from '../../../../theme';

export const StudentInfoTab = ({ route }: any) => {
  const { t } = useI18n();
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
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

  const InfoRow = ({ label, value }: { label: string; value: string }) => (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );

  const MoneyRow = ({
    label,
    amount,
    color,
  }: {
    label: string;
    amount: number;
    color?: string;
  }) => (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={[styles.money, color ? { color } : null]}>{formatAmount(amount, currency)}</Text>
    </View>
  );

  if (loading) {
    return (
      <Screen contentContainerStyle={styles.content} edges={[]}>
        <SkeletonCard lines={4} />
        <SkeletonCard lines={3} />
      </Screen>
    );
  }

  if (!profile || !financial) {
    return (
      <Screen scroll={false} edges={[]}>
        <EmptyState
          icon="alert-circle-outline"
          title={t('studentInfo.notFound')}
          tone="danger"
          action={{ label: t('common.retry'), onPress: loadData }}
          style={styles.empty}
        />
      </Screen>
    );
  }

  return (
    <Screen contentContainerStyle={styles.content} edges={[]}>
      <Card style={styles.card}>
        <SectionHeader title={t('profile.personalInfo')} icon="person-outline" />
        <InfoRow label={t('studentInfo.name')} value={formatPersonName(profile)} />
        <InfoRow label={t('studentInfo.email')} value={profile.email} />
        {profile.phone ? <InfoRow label={t('studentInfo.phone')} value={profile.phone} /> : null}
        {profile.address ? (
          <InfoRow label={t('studentInfo.address')} value={profile.address} />
        ) : null}
        {profile.dateOfBirth ? (
          <InfoRow label={t('studentInfo.dateOfBirth')} value={formatDate(profile.dateOfBirth)} />
        ) : null}
        {profile.licenseNumber ? (
          <InfoRow label={t('studentInfo.licenseNumber')} value={profile.licenseNumber} />
        ) : null}
        {profile.enrollmentDate ? (
          <InfoRow
            label={t('studentInfo.enrollmentDate')}
            value={formatDate(profile.enrollmentDate)}
          />
        ) : null}
      </Card>

      {profile.emergencyContact || profile.emergencyPhone ? (
        <Card style={styles.card}>
          <SectionHeader title={t('studentInfo.emergencyContact')} icon="call-outline" />
          {profile.emergencyContact ? (
            <InfoRow label={t('studentInfo.name')} value={profile.emergencyContact} />
          ) : null}
          {profile.emergencyPhone ? (
            <InfoRow label={t('studentInfo.phone')} value={profile.emergencyPhone} />
          ) : null}
        </Card>
      ) : null}

      <Card style={styles.card}>
        <SectionHeader title={t('studentInfo.progress')} icon="bar-chart-outline" />
        <View style={styles.stats}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{profile.totalLessons}</Text>
            <Text style={styles.statLabel}>{t('studentInfo.totalLessons')}</Text>
          </View>
          <View style={styles.stat}>
            <Text style={[styles.statValue, styles.statSuccess]}>{profile.completedLessons}</Text>
            <Text style={styles.statLabel}>{t('studentInfo.completed')}</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{profile.totalExams}</Text>
            <Text style={styles.statLabel}>{t('studentInfo.exams')}</Text>
          </View>
          <View style={styles.stat}>
            <Text style={[styles.statValue, styles.statSuccess]}>{profile.passedExams}</Text>
            <Text style={styles.statLabel}>{t('studentInfo.passed')}</Text>
          </View>
        </View>
      </Card>

      <Card style={styles.card}>
        <SectionHeader title={t('profile.financialSummary')} icon="cash-outline" />
        <MoneyRow
          label={t('studentInfo.totalRevenue')}
          amount={financial.totalRevenue}
          color={theme.colors.successText}
        />
        <MoneyRow
          label={t('studentInfo.pendingPayment')}
          amount={financial.totalPending}
          color={theme.colors.warningText}
        />
        <View style={styles.divider} />
        <MoneyRow label={t('studentInfo.lessonsRevenue')} amount={financial.lessonsRevenue} />
        <MoneyRow label={t('studentInfo.lessonsPending')} amount={financial.lessonsPending} />
        <MoneyRow label={t('studentInfo.examsRevenue')} amount={financial.examsRevenue} />
        <MoneyRow label={t('studentInfo.examsPending')} amount={financial.examsPending} />
        <View style={styles.divider} />
        <MoneyRow
          label={t('studentInfo.creditAvailable')}
          amount={financial.credit}
          color={theme.colors.accentText}
        />
        {financial.lastPaymentDate ? (
          <Text style={styles.hint}>
            {t('studentInfo.lastPaymentOn', { date: formatDate(financial.lastPaymentDate) })}
          </Text>
        ) : null}
      </Card>

      <Card style={styles.card}>
        <SectionHeader title={t('studentInfo.notesTitle')} icon="document-text-outline" />
        {profile.notes ? (
          <Text style={styles.notes}>{profile.notes}</Text>
        ) : (
          <Text style={styles.hint}>{t('studentInfo.noNotes')}</Text>
        )}
        <Button
          title={t('studentInfo.editNotes')}
          onPress={() => setShowNotesModal(true)}
          variant="secondary"
          size="sm"
          icon="create-outline"
        />
      </Card>

      <Modal
        visible={showNotesModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowNotesModal(false)}
      >
        <View style={styles.overlay}>
          <Card style={styles.modal}>
            <Text style={styles.modalTitle}>{t('studentInfo.notesTitle')}</Text>

            <Field
              label={t('studentInfo.notesTitle')}
              placeholder={t('studentInfo.notesPlaceholder')}
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={8}
              textAlignVertical="top"
              style={styles.notesInput}
            />

            <View style={styles.modalActions}>
              <Button
                title={t('common.cancel')}
                onPress={() => setShowNotesModal(false)}
                variant="secondary"
                style={styles.action}
              />
              <Button
                title={t('common.save')}
                onPress={handleSaveNotes}
                loading={savingNotes}
                style={styles.action}
              />
            </View>
          </Card>
        </View>
      </Modal>
    </Screen>
  );
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    content: { paddingTop: theme.spacing.base, gap: theme.spacing.md },
    empty: { flex: 1 },
    card: { gap: theme.spacing.sm },
    infoRow: { flexDirection: 'row', justifyContent: 'space-between', gap: theme.spacing.md },
    infoLabel: { fontSize: theme.typography.size.sm, color: theme.colors.textSecondary },
    infoValue: {
      flexShrink: 1,
      textAlign: 'right',
      fontSize: theme.typography.size.sm,
      fontWeight: theme.typography.weight.medium,
      color: theme.colors.textPrimary,
    },
    money: {
      fontSize: theme.typography.size.sm,
      fontWeight: theme.typography.weight.semibold,
      color: theme.colors.textPrimary,
    },
    divider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: theme.colors.border,
      marginVertical: theme.spacing.xs,
    },
    stats: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.md },
    stat: {
      flexGrow: 1,
      flexBasis: '40%',
      alignItems: 'center',
      gap: 2,
      paddingVertical: theme.spacing.md,
      borderRadius: theme.radius.md,
      backgroundColor: theme.colors.surfaceMuted,
    },
    statValue: {
      fontSize: theme.typography.size['2xl'],
      fontWeight: theme.typography.weight.bold,
      color: theme.colors.textPrimary,
    },
    statSuccess: { color: theme.colors.successText },
    statLabel: { fontSize: theme.typography.size.xs, color: theme.colors.textSecondary },
    notes: { fontSize: theme.typography.size.sm, color: theme.colors.textPrimary },
    hint: { fontSize: theme.typography.size.xs, color: theme.colors.textMuted },

    overlay: {
      flex: 1,
      backgroundColor: theme.colors.overlay,
      justifyContent: 'center',
      padding: theme.spacing.lg,
    },
    modal: { gap: theme.spacing.md },
    modalTitle: {
      fontSize: theme.typography.size.lg,
      fontWeight: theme.typography.weight.bold,
      color: theme.colors.textPrimary,
    },
    notesInput: { minHeight: 140 },
    modalActions: { flexDirection: 'row', gap: theme.spacing.md },
    action: { flex: 1 },
  });
