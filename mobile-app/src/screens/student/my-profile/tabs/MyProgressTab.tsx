/**
 * Onglet « Progression » de Mon profil (11.3) — P8 et P11 : informations personnelles,
 * avancement des leçons et des examens, situation financière et avoir (D-40, devise D-43).
 */

import React, { useEffect, useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { studentSelfProfileService } from '../../../../services/api/StudentSelfProfileService';
import { getApiErrorMessage } from '../../../../services/api/ApiError';
import { FinancialSummary, MyProfile } from '../../../../models/Profile';
import { useSchoolCurrency } from '../../../../hooks/useSchoolCurrency';
import { useI18n } from '../../../../context/LanguageContext';
import { useTheme } from '../../../../context/ThemeContext';
import { Card, EmptyState, Screen, SectionHeader, SkeletonCard } from '../../../../components/ui';
import { formatAmount, formatDate, formatPersonName } from '../../../../utils/format';
import { Theme } from '../../../../theme';
import { IoniconName } from '../../../../utils/rtl';

export const MyProgressTab = ({ route }: any) => {
  const { t } = useI18n();
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
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

  const InfoRow = ({ label, value }: { label: string; value: string }) => (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );

  /** Une barre de progression : la part faite, dans l'intention demandée. */
  const ProgressBar = ({ rate, tone }: { rate: number; tone: 'accent' | 'success' }) => (
    <View style={styles.track}>
      <View
        style={[
          styles.fill,
          { width: `${rate}%` },
          tone === 'success' ? styles.fillSuccess : styles.fillAccent,
        ]}
      />
    </View>
  );

  const MoneyRow = ({
    label,
    amount,
    icon,
    color,
  }: {
    label: string;
    amount: number;
    icon: IoniconName;
    color: string;
  }) => (
    <View style={styles.moneyRow}>
      <View style={styles.moneyLabel}>
        <Ionicons name={icon} size={20} color={color} />
        <Text style={styles.moneyLabelText}>{label}</Text>
      </View>
      <Text style={[styles.moneyAmount, { color }]}>{formatAmount(amount, currency)}</Text>
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
          title={t('profile.loadFailed')}
          tone="danger"
          action={{ label: t('common.retry'), onPress: loadData }}
          style={styles.empty}
        />
      </Screen>
    );
  }

  const completionRate =
    profile.totalLessons > 0
      ? Math.round((profile.completedLessons / profile.totalLessons) * 100)
      : 0;

  const examPassRate =
    profile.totalExams > 0 ? Math.round((profile.passedExams / profile.totalExams) * 100) : 0;

  return (
    <Screen contentContainerStyle={styles.content} edges={[]}>
      <Card style={styles.card}>
        <SectionHeader title={t('profile.personalInfo')} icon="person-outline" />
        <InfoRow label={t('profile.name')} value={formatPersonName(profile)} />
        <InfoRow label={t('profile.email')} value={profile.email} />
        {profile.phone ? <InfoRow label={t('profile.phone')} value={profile.phone} /> : null}
        {profile.licenseNumber ? (
          <InfoRow label={t('profile.licenseNumber')} value={profile.licenseNumber} />
        ) : null}
        {profile.enrollmentDate ? (
          <InfoRow label={t('profile.enrolledSince')} value={formatDate(profile.enrollmentDate)} />
        ) : null}
      </Card>

      <Card style={styles.card}>
        <SectionHeader title={t('profile.statistics')} icon="bar-chart-outline" />

        <View style={styles.progress}>
          <Text style={styles.progressLabel}>{t('profile.lessonsCompletion')}</Text>
          <ProgressBar rate={completionRate} tone="accent" />
          <Text style={styles.progressText}>
            {t('profile.ofCompleted', {
              done: profile.completedLessons,
              total: profile.totalLessons,
              rate: completionRate,
            })}
          </Text>
        </View>

        <View style={styles.progress}>
          <Text style={styles.progressLabel}>{t('profile.examPassRate')}</Text>
          <ProgressBar rate={examPassRate} tone="success" />
          <Text style={styles.progressText}>
            {t('profile.ofCompleted', {
              done: profile.passedExams,
              total: profile.totalExams,
              rate: examPassRate,
            })}
          </Text>
        </View>
      </Card>

      <Card style={styles.card}>
        <SectionHeader title={t('profile.financialSummary')} icon="cash-outline" />
        <MoneyRow
          label={t('profile.totalPaid')}
          amount={financial.totalRevenue}
          icon="checkmark-circle-outline"
          color={theme.colors.successText}
        />
        <MoneyRow
          label={t('profile.amountDue')}
          amount={financial.totalDue}
          icon="alert-circle-outline"
          color={theme.colors.warningText}
        />
        <MoneyRow
          label={t('profile.creditAvailable')}
          amount={financial.credit}
          icon="gift-outline"
          color={theme.colors.signalText}
        />
        {financial.credit > 0 ? <Text style={styles.hint}>{t('profile.creditHint')}</Text> : null}
        {financial.lastPaymentDate ? (
          <View style={styles.lastPayment}>
            <Text style={styles.infoLabel}>{t('profile.lastPayment')}</Text>
            <Text style={styles.infoValue}>{formatDate(financial.lastPaymentDate)}</Text>
          </View>
        ) : null}
      </Card>
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
    progress: { gap: theme.spacing.xs },
    progressLabel: {
      fontSize: theme.typography.size.sm,
      fontWeight: theme.typography.weight.medium,
      color: theme.colors.textPrimary,
    },
    track: {
      height: 8,
      borderRadius: theme.radius.pill,
      backgroundColor: theme.colors.surfaceMuted,
      overflow: 'hidden',
    },
    fill: { height: '100%', borderRadius: theme.radius.pill },
    fillAccent: { backgroundColor: theme.colors.signal },
    fillSuccess: { backgroundColor: theme.colors.success },
    progressText: { fontSize: theme.typography.size.xs, color: theme.colors.textSecondary },
    moneyRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: theme.spacing.sm,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.border,
    },
    moneyLabel: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
    moneyLabelText: { fontSize: theme.typography.size.sm, color: theme.colors.textPrimary },
    moneyAmount: {
      fontSize: theme.typography.size.base,
      fontWeight: theme.typography.weight.semibold,
    },
    hint: { fontSize: theme.typography.size.xs, color: theme.colors.textMuted },
    lastPayment: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingTop: theme.spacing.sm,
    },
  });
