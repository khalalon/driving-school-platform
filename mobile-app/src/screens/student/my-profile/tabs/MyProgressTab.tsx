/**
 * My Progress Tab
 * Single Responsibility: Display student's progress and statistics
 */

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { studentSelfProfileService } from '../../../../services/api/StudentSelfProfileService';
import { getApiErrorMessage } from '../../../../services/api/ApiError';
import { FinancialSummary, MyProfile } from '../../../../models/Profile';
import { useSchoolCurrency } from '../../../../hooks/useSchoolCurrency';
import { useI18n } from '../../../../context/LanguageContext';
import { formatAmount, formatDate, formatPersonName } from '../../../../utils/format';
import { colors, typography, spacing } from '../../../../theme';

export const MyProgressTab = ({ route }: any) => {
  const { t } = useI18n();
  const { schoolId } = route.params;
  const currency = useSchoolCurrency(schoolId);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<MyProfile | null>(null);
  const [financial, setFinancial] = useState<FinancialSummary | null>(null);

  useEffect(() => {
    loadData();
  }, [schoolId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [profileData, financialData] = await Promise.all([
        studentSelfProfileService.getMyProfile(schoolId),
        studentSelfProfileService.getMyFinancialSummary(schoolId),
      ]);
      setProfile(profileData);
      setFinancial(financialData);
    } catch (error) {
      Alert.alert(t('common.error'), getApiErrorMessage(error, t('profile.loadFailed')));
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary[600]} />
      </View>
    );
  }

  if (!profile || !financial) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="alert-circle-outline" size={48} color={colors.text.tertiary} />
        <Text style={styles.emptyText}>{t('profile.loadFailed')}</Text>
      </View>
    );
  }

  const completionRate =
    profile.totalLessons > 0
      ? Math.round((profile.completedLessons / profile.totalLessons) * 100)
      : 0;

  const examPassRate =
    profile.totalExams > 0 ? Math.round((profile.passedExams / profile.totalExams) * 100) : 0;

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Personal Information Card */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="person-outline" size={20} color={colors.primary[600]} />
          <Text style={styles.cardTitle}>{t('profile.personalInfo')}</Text>
        </View>
        <View style={styles.cardContent}>
          <InfoRow label={t('profile.name')} value={formatPersonName(profile)} />
          <InfoRow label={t('profile.email')} value={profile.email} />
          {profile.phone && <InfoRow label={t('profile.phone')} value={profile.phone} />}
          {profile.licenseNumber && (
            <InfoRow label={t('profile.licenseNumber')} value={profile.licenseNumber} />
          )}
          {profile.enrollmentDate && (
            <InfoRow
              label={t('profile.enrolledSince')}
              value={formatDate(profile.enrollmentDate)}
            />
          )}
        </View>
      </View>

      {/* Progress Statistics Card */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="bar-chart-outline" size={20} color={colors.primary[600]} />
          <Text style={styles.cardTitle}>{t('profile.statistics')}</Text>
        </View>
        <View style={styles.cardContent}>
          {/* Lessons Progress */}
          <View style={styles.progressSection}>
            <Text style={styles.progressLabel}>{t('profile.lessonsCompletion')}</Text>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${completionRate}%` }]} />
            </View>
            <Text style={styles.progressText}>
              {t('profile.ofCompleted', {
                done: profile.completedLessons,
                total: profile.totalLessons,
                rate: completionRate,
              })}
            </Text>
          </View>

          {/* Exams Progress */}
          <View style={styles.progressSection}>
            <Text style={styles.progressLabel}>{t('profile.examPassRate')}</Text>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${examPassRate}%`, backgroundColor: colors.success[500] },
                ]}
              />
            </View>
            <Text style={styles.progressText}>
              {t('profile.ofCompleted', {
                done: profile.passedExams,
                total: profile.totalExams,
                rate: examPassRate,
              })}
            </Text>
          </View>
        </View>
      </View>

      {/* Financial Summary Card */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="cash-outline" size={20} color={colors.primary[600]} />
          <Text style={styles.cardTitle}>{t('profile.financialSummary')}</Text>
        </View>
        <View style={styles.cardContent}>
          <FinancialRow
            label={t('profile.totalPaid')}
            amount={financial.totalRevenue}
            currency={currency}
            icon="checkmark-circle-outline"
            iconColor={colors.success[500]}
          />
          <FinancialRow
            label={t('profile.amountDue')}
            amount={financial.totalDue}
            currency={currency}
            icon="alert-circle-outline"
            iconColor={colors.warning[500]}
          />
          <FinancialRow
            label={t('profile.creditAvailable')}
            amount={financial.credit}
            currency={currency}
            icon="gift-outline"
            iconColor={colors.primary[600]}
          />
          {financial.credit > 0 && <Text style={styles.creditHint}>{t('profile.creditHint')}</Text>}
          {financial.lastPaymentDate && (
            <View style={styles.lastPaymentContainer}>
              <Text style={styles.lastPaymentLabel}>{t('profile.lastPayment')}</Text>
              <Text style={styles.lastPaymentValue}>
                {new Date(financial.lastPaymentDate).toLocaleDateString()}
              </Text>
            </View>
          )}
        </View>
      </View>
    </ScrollView>
  );
};

interface InfoRowProps {
  label: string;
  value: string;
}

const InfoRow: React.FC<InfoRowProps> = ({ label, value }) => (
  <View style={styles.infoRow}>
    <Text style={styles.infoLabel}>{label}</Text>
    <Text style={styles.infoValue}>{value}</Text>
  </View>
);

interface FinancialRowProps {
  label: string;
  amount: number;
  currency: string | null;
  icon: string;
  iconColor: string;
}

const FinancialRow: React.FC<FinancialRowProps> = ({
  label,
  amount,
  currency,
  icon,
  iconColor,
}) => (
  <View style={styles.financialRow}>
    <View style={styles.financialLabel}>
      <Ionicons name={icon as any} size={20} color={iconColor} />
      <Text style={styles.financialLabelText}>{label}</Text>
    </View>
    <Text style={[styles.financialAmount, { color: iconColor }]}>
      {formatAmount(amount, currency)}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.secondary,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background.secondary,
  },
  emptyText: {
    fontSize: typography.size.base,
    color: colors.text.tertiary,
    marginTop: spacing.md,
  },
  card: {
    backgroundColor: colors.background.primary,
    borderRadius: 12,
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    padding: spacing.md,
    shadowColor: colors.neutral[900],
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  cardTitle: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
    marginStart: spacing.sm,
  },
  cardContent: {
    gap: spacing.sm,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  infoLabel: {
    fontSize: typography.size.sm,
    color: colors.text.secondary,
  },
  infoValue: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.medium,
    color: colors.text.primary,
  },
  progressSection: {
    marginTop: spacing.sm,
  },
  progressLabel: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.medium,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  progressBar: {
    height: 8,
    backgroundColor: colors.neutral[200],
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary[600],
    borderRadius: 4,
  },
  progressText: {
    fontSize: typography.size.xs,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  financialRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[200],
  },
  financialLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  financialLabelText: {
    fontSize: typography.size.sm,
    color: colors.text.primary,
  },
  financialAmount: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.semibold,
  },
  creditHint: {
    fontSize: typography.size.xs,
    color: colors.text.tertiary,
    fontStyle: 'italic',
    marginTop: spacing.xs,
  },
  lastPaymentContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.neutral[200],
  },
  lastPaymentLabel: {
    fontSize: typography.size.sm,
    color: colors.text.secondary,
  },
  lastPaymentValue: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.medium,
    color: colors.text.primary,
  },
});
