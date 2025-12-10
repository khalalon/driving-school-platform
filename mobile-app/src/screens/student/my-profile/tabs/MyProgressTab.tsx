/**
 * My Progress Tab
 * Single Responsibility: Display student's progress and statistics
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { studentSelfProfileService, MyProfile, MyFinancialSummary } from '../../../../services/api/StudentSelfProfileService';
import { colors, typography, spacing } from '../../../../theme';

export const MyProgressTab = ({ route }: any) => {
  const { schoolId } = route.params;
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<MyProfile | null>(null);
  const [financial, setFinancial] = useState<MyFinancialSummary | null>(null);

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
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to load profile data');
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
        <Text style={styles.emptyText}>Failed to load profile data</Text>
      </View>
    );
  }

  const completionRate = profile.totalLessons > 0
    ? Math.round((profile.completedLessons / profile.totalLessons) * 100)
    : 0;

  const examPassRate = profile.totalExams > 0
    ? Math.round((profile.passedExams / profile.totalExams) * 100)
    : 0;

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Personal Information Card */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="person-outline" size={20} color={colors.primary[600]} />
          <Text style={styles.cardTitle}>Personal Information</Text>
        </View>
        <View style={styles.cardContent}>
          <InfoRow label="Name" value={profile.name} />
          <InfoRow label="Email" value={profile.email} />
          {profile.phone && <InfoRow label="Phone" value={profile.phone} />}
          {profile.licenseNumber && (
            <InfoRow label="License Number" value={profile.licenseNumber} />
          )}
          {profile.enrollmentDate && (
            <InfoRow
              label="Enrolled Since"
              value={new Date(profile.enrollmentDate).toLocaleDateString()}
            />
          )}
        </View>
      </View>

      {/* Progress Statistics Card */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="bar-chart-outline" size={20} color={colors.primary[600]} />
          <Text style={styles.cardTitle}>Progress Statistics</Text>
        </View>
        <View style={styles.cardContent}>
          {/* Lessons Progress */}
          <View style={styles.progressSection}>
            <Text style={styles.progressLabel}>Lessons Completion</Text>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${completionRate}%` }]} />
            </View>
            <Text style={styles.progressText}>
              {profile.completedLessons} of {profile.totalLessons} completed ({completionRate}%)
            </Text>
          </View>

          {/* Exams Progress */}
          <View style={styles.progressSection}>
            <Text style={styles.progressLabel}>Exam Pass Rate</Text>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${examPassRate}%`, backgroundColor: colors.success[500] },
                ]}
              />
            </View>
            <Text style={styles.progressText}>
              {profile.passedExams} of {profile.totalExams} passed ({examPassRate}%)
            </Text>
          </View>
        </View>
      </View>

      {/* Financial Summary Card */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="cash-outline" size={20} color={colors.primary[600]} />
          <Text style={styles.cardTitle}>Financial Summary</Text>
        </View>
        <View style={styles.cardContent}>
          <FinancialRow
            label="Total Paid"
            amount={financial.totalRevenue}
            icon="checkmark-circle-outline"
            iconColor={colors.success[500]}
          />
          <FinancialRow
            label="Pending Payment"
            amount={financial.totalPending}
            icon="time-outline"
            iconColor={colors.warning[500]}
          />
          <FinancialRow
            label="Overdue"
            amount={financial.totalDue}
            icon="alert-circle-outline"
            iconColor={colors.error[500]}
          />
          {financial.lastPaymentDate && (
            <View style={styles.lastPaymentContainer}>
              <Text style={styles.lastPaymentLabel}>Last Payment:</Text>
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
  icon: string;
  iconColor: string;
}

const FinancialRow: React.FC<FinancialRowProps> = ({
  label,
  amount,
  icon,
  iconColor,
}) => (
  <View style={styles.financialRow}>
    <View style={styles.financialLabel}>
      <Ionicons name={icon as any} size={20} color={iconColor} />
      <Text style={styles.financialLabelText}>{label}</Text>
    </View>
    <Text style={[styles.financialAmount, { color: iconColor }]}>
      ${amount.toFixed(2)}
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
    marginLeft: spacing.sm,
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
