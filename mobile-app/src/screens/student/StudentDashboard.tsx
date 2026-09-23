/**
 * Student Dashboard — « My journey » (D-45, 8.2)
 * Single Responsibility: l'accueil de l'élève raconte son parcours.
 *
 * L'école active est celle de l'inscription approuvée (une seule, D-22), retrouvée par E3 à
 * chaque retour sur l'écran. Ensuite : prochaine leçon (L1), parcours (P8 + X1 + L1, règles
 * pures dans `models/Journey.ts`), dû et avoir (P11, devise de l'école), actions L2 / X2.
 * Sans inscription approuvée : accueil réduit à la recherche d'école et au suivi des demandes.
 */

import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { useI18n } from '../../context/LanguageContext';
import { enrollmentService } from '../../services/api/EnrollmentService';
import { lessonService } from '../../services/api/LessonService';
import { examService } from '../../services/api/ExamService';
import { studentSelfProfileService } from '../../services/api/StudentSelfProfileService';
import { getApiErrorCode, getApiErrorMessage } from '../../services/api/ApiError';
import { EnrollmentRequest, EnrollmentStatus } from '../../models/Enrollment';
import {
  LESSON_CANCEL_HOURS,
  lessonTypeLabel,
  Lesson,
  LessonStatus,
  canStudentCancel,
} from '../../models/Lesson';
import { Exam } from '../../models/Exam';
import { FinancialSummary, MyProfile } from '../../models/Profile';
import { JourneyStep, buildJourney } from '../../models/Journey';
import { useSchoolCurrency } from '../../hooks/useSchoolCurrency';
import {
  formatAmount,
  formatCountdown,
  formatDate,
  formatPersonName,
  formatTime,
} from '../../utils/format';
import { colors, typography, spacing, shadows } from '../../theme';

interface HomeData {
  lessons: Lesson[];
  exams: Exam[];
  profile: MyProfile | null;
  financial: FinancialSummary | null;
}

/** La prochaine leçon planifiée : la première dont la fin n'est pas passée. */
const findNextLesson = (lessons: Lesson[], now: Date = new Date()): Lesson | null =>
  lessons
    .filter((l) => l.status === LessonStatus.SCHEDULED && l.scheduledDate)
    .filter((l) => {
      const start = new Date(l.scheduledDate as string).getTime();
      return start + (l.durationMinutes ?? 60) * 60000 > now.getTime();
    })
    .sort((a, b) => (a.scheduledDate as string).localeCompare(b.scheduledDate as string))[0] ??
  null;

export const StudentDashboard = ({ navigation }: any) => {
  const { t } = useI18n();
  const { user, logout } = useAuth();
  // `undefined` = pas encore chargé, `null` = aucune inscription approuvée
  const [enrollment, setEnrollment] = useState<EnrollmentRequest | null | undefined>(undefined);
  const [data, setData] = useState<HomeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const schoolId = enrollment?.schoolId ?? null;
  const currency = useSchoolCurrency(schoolId);

  const load = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);
      // E3 : l'inscription approuvée donne l'école de la fiche élève
      const requests = await enrollmentService.getMyRequests();
      const approved = requests.find((r) => r.status === EnrollmentStatus.APPROVED) ?? null;
      setEnrollment(approved);
      if (!approved) {
        setData(null);
        return;
      }
      const [lessons, exams, profile, financial] = await Promise.all([
        lessonService.getMyLessons({
          status: [LessonStatus.PENDING, LessonStatus.SCHEDULED],
        }),
        examService.getMyExams(),
        studentSelfProfileService.getMyProfile(approved.schoolId).catch(() => null),
        studentSelfProfileService.getMyFinancialSummary(approved.schoolId).catch(() => null),
      ]);
      setData({ lessons, exams, profile, financial });
    } catch (err) {
      setError(getApiErrorMessage(err, t('home.loadFailed')));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const handleLogout = async () => {
    await logout();
    // No need to navigate - AuthContext will trigger navigator rebuild
  };

  const handleCancelLesson = (lesson: Lesson) => {
    Alert.alert(t('home.cancelTitle'), t('home.cancelConfirm'), [
      { text: t('home.cancelNo'), style: 'cancel' },
      {
        text: t('home.cancelYes'),
        style: 'destructive',
        onPress: async () => {
          try {
            await lessonService.cancelLesson(lesson.id);
            load();
          } catch (err) {
            // Fenêtre de 24 h (D-24) contrôlée par le serveur : le bouton n'est qu'un confort
            if (getApiErrorCode(err) === 'CANCEL_WINDOW_CLOSED') {
              Alert.alert(
                t('home.tooLateTitle'),
                getApiErrorMessage(err, t('home.tooLateText', { hours: LESSON_CANCEL_HOURS }))
              );
              load();
              return;
            }
            Alert.alert(t('common.error'), getApiErrorMessage(err, t('home.cancelFailed')));
          }
        },
      },
    ]);
  };

  const openMyProfile = () => {
    if (!schoolId) return;
    navigation.navigate('MyProfile', { schoolId });
  };

  const requestLesson = () => {
    if (!schoolId) return;
    navigation.navigate('BookLesson', { schoolId });
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.headerText}>
        <Text style={styles.greeting}>{t('home.hello')}</Text>
        <Text style={styles.userName}>{user?.firstName || t('home.student')}</Text>
        {enrollment?.schoolName ? (
          <Text style={styles.schoolName}>{enrollment.schoolName}</Text>
        ) : null}
      </View>
      <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
        <Ionicons name="log-out-outline" size={24} color={colors.text.secondary} />
      </TouchableOpacity>
    </View>
  );

  const renderNotEnrolled = () => (
    <View style={styles.heroCard}>
      <Ionicons name="school-outline" size={36} color={colors.primary[600]} />
      <Text style={styles.heroTitle}>{t('home.findSchool')}</Text>
      <Text style={styles.heroText}>{t('home.findSchoolText')}</Text>
      <TouchableOpacity
        style={styles.primaryButton}
        onPress={() => navigation.navigate('SchoolsList')}
      >
        <Text style={styles.primaryButtonText}>{t('home.browseSchools')}</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.secondaryButton}
        onPress={() => navigation.navigate('MyEnrollmentRequests')}
      >
        <Text style={styles.secondaryButtonText}>{t('home.enrollmentStatus')}</Text>
      </TouchableOpacity>
    </View>
  );

  const renderNextLesson = (lessons: Lesson[]) => {
    const next = findNextLesson(lessons);
    const pendingCount = lessons.filter((l) => l.status === LessonStatus.PENDING).length;
    return (
      <View style={styles.nextCard}>
        <Text style={styles.nextLabel}>{t('home.nextLesson')}</Text>
        {next ? (
          <>
            <View style={styles.nextRow}>
              <Text style={styles.nextTitle}>{lessonTypeLabel(next.type)}</Text>
              <View style={styles.countdownPill}>
                <Ionicons name="time-outline" size={14} color={colors.primary[700]} />
                <Text style={styles.countdownText}>{formatCountdown(next.scheduledDate)}</Text>
              </View>
            </View>
            <Text style={styles.nextWhen}>
              {formatDate(next.scheduledDate)} · {formatTime(next.scheduledDate)}
              {next.durationMinutes ? ` · ${t('format.minutes', { count: next.durationMinutes })}` : ''}
            </Text>
            <Text style={styles.nextMeta}>
              {t('home.withInstructor', {
                name: formatPersonName(next.instructor, t('home.yourInstructor')),
              })}
            </Text>
            <View style={styles.nextActions}>
              <TouchableOpacity
                style={styles.inverseButton}
                onPress={() => navigation.navigate('MyLessons')}
              >
                <Text style={styles.inverseButtonText}>{t('home.allLessons')}</Text>
              </TouchableOpacity>
              {canStudentCancel(next) ? (
                <TouchableOpacity
                  style={styles.ghostButton}
                  onPress={() => handleCancelLesson(next)}
                >
                  <Text style={styles.ghostButtonText}>{t('home.cancel')}</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </>
        ) : (
          <>
            <Text style={styles.nextTitle}>{t('home.noLesson')}</Text>
            <Text style={styles.nextMeta}>
              {pendingCount === 0
                ? t('home.askLesson')
                : pendingCount === 1
                  ? t('home.pendingOne')
                  : t('home.pendingMany', { count: pendingCount })}
            </Text>
            <View style={styles.nextActions}>
              <TouchableOpacity style={styles.inverseButton} onPress={requestLesson}>
                <Text style={styles.inverseButtonText}>{t('home.requestLesson')}</Text>
              </TouchableOpacity>
              {pendingCount > 0 ? (
                <TouchableOpacity
                  style={styles.ghostButton}
                  onPress={() => navigation.navigate('MyLessons')}
                >
                  <Text style={styles.ghostButtonText}>{t('home.myRequests')}</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </>
        )}
      </View>
    );
  };

  const renderStep = (step: JourneyStep, index: number, count: number) => {
    const isLast = index === count - 1;
    const iconName =
      step.state === 'done'
        ? 'checkmark-circle'
        : step.kind === 'exam'
          ? 'ribbon-outline'
          : 'car-outline';
    const iconColor =
      step.state === 'done'
        ? colors.success[600]
        : step.state === 'current'
          ? colors.primary[600]
          : step.state === 'started'
            ? colors.warning[600]
            : colors.neutral[400];
    return (
      <View key={step.key} style={styles.stepRow}>
        <View style={styles.stepRail}>
          <View
            style={[
              styles.stepDot,
              step.state === 'current' && styles.stepDotCurrent,
              step.state === 'done' && styles.stepDotDone,
            ]}
          >
            <Ionicons name={iconName as any} size={18} color={iconColor} />
          </View>
          {!isLast ? (
            <View style={[styles.stepLine, step.state === 'done' && styles.stepLineDone]} />
          ) : null}
        </View>
        <View style={[styles.stepBody, step.state === 'current' && styles.stepBodyCurrent]}>
          <View style={styles.stepTitleRow}>
            <Text style={[styles.stepTitle, step.state === 'upcoming' && styles.stepTitleMuted]}>
              {step.title}
            </Text>
            {step.state === 'current' ? (
              <View style={styles.currentPill}>
                <Text style={styles.currentPillText}>{t('home.now')}</Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.stepDetail}>{step.detail}</Text>
        </View>
      </View>
    );
  };

  const renderJourney = (home: HomeData) => {
    const steps = buildJourney(home.profile?.completedLessonsByType, home.exams, home.lessons);
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>{t('home.myJourney')}</Text>
          <TouchableOpacity onPress={() => navigation.navigate('MyExams')}>
            <Text style={styles.cardLink}>{t('home.myExams')}</Text>
          </TouchableOpacity>
        </View>
        {steps.map((step, index) => renderStep(step, index, steps.length))}
      </View>
    );
  };

  const renderMoney = (financial: FinancialSummary | null) => (
    <View style={styles.tilesRow}>
      <TouchableOpacity style={styles.tile} onPress={openMyProfile} activeOpacity={0.7}>
        <Text style={styles.tileLabel}>{t('home.amountDue')}</Text>
        <Text style={[styles.tileValue, (financial?.totalDue ?? 0) > 0 && styles.tileValueDue]}>
          {formatAmount(financial?.totalDue ?? 0, currency)}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.tile} onPress={openMyProfile} activeOpacity={0.7}>
        <Text style={styles.tileLabel}>{t('home.yourCredit')}</Text>
        <Text style={[styles.tileValue, (financial?.credit ?? 0) > 0 && styles.tileValueCredit]}>
          {formatAmount(financial?.credit ?? 0, currency)}
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderActions = () => (
    <View style={styles.actionsRow}>
      <TouchableOpacity style={styles.actionButton} onPress={requestLesson} activeOpacity={0.8}>
        <Ionicons name="calendar-outline" size={20} color={colors.text.inverse} />
        <Text style={styles.actionText}>{t('home.requestLesson')}</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.actionButton, styles.actionButtonAlt]}
        onPress={() => navigation.navigate('RequestExam')}
        activeOpacity={0.8}
      >
        <Ionicons name="ribbon-outline" size={20} color={colors.primary[700]} />
        <Text style={[styles.actionText, styles.actionTextAlt]}>{t('home.requestExam')}</Text>
      </TouchableOpacity>
    </View>
  );

  const renderLinks = () => (
    <View style={styles.linksRow}>
      {[
        { label: t('home.link.myLessons'), route: 'MyLessons', icon: 'list-outline' },
        { label: t('home.link.myProfile'), route: 'MyProfile', icon: 'person-outline' },
        {
          label: t('home.link.enrollment'),
          route: 'MyEnrollmentRequests',
          icon: 'school-outline',
        },
        { label: t('home.link.schools'), route: 'SchoolsList', icon: 'business-outline' },
      ].map((link) => (
        <TouchableOpacity
          key={link.route}
          style={styles.linkChip}
          onPress={() =>
            link.route === 'MyProfile' ? openMyProfile() : navigation.navigate(link.route)
          }
        >
          <Ionicons name={link.icon as any} size={16} color={colors.text.secondary} />
          <Text style={styles.linkText}>{link.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderBody = () => {
    // Tant que l'école n'est pas connue, ou que ses données arrivent, on n'annonce rien :
    // afficher « Find your driving school » à un élève inscrit serait faux (recette 23/09).
    if (loading && !data) {
      return (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary[600]} />
        </View>
      );
    }
    if (error && !data) {
      return (
        <View style={styles.heroCard}>
          <Ionicons name="cloud-offline-outline" size={32} color={colors.error[600]} />
          <Text style={styles.heroText}>{error}</Text>
          <TouchableOpacity style={styles.primaryButton} onPress={load}>
            <Text style={styles.primaryButtonText}>{t('common.retry')}</Text>
          </TouchableOpacity>
        </View>
      );
    }
    if (!enrollment || !data) {
      return renderNotEnrolled();
    }
    return (
      <>
        {error ? <Text style={styles.errorBanner}>{error}</Text> : null}
        {renderNextLesson(data.lessons)}
        {renderJourney(data)}
        {renderMoney(data.financial)}
        {renderActions()}
        {renderLinks()}
      </>
    );
  };

  return (
    <View style={styles.container}>
      {renderHeader()}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary[600]]}
          />
        }
      >
        {renderBody()}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.secondary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing['4xl'],
    paddingBottom: spacing.lg,
    backgroundColor: colors.background.primary,
  },
  headerText: {
    flex: 1,
  },
  greeting: {
    fontSize: typography.size.base,
    color: colors.text.secondary,
  },
  userName: {
    fontSize: typography.size['2xl'],
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
  },
  schoolName: {
    marginTop: spacing.xs,
    fontSize: typography.size.sm,
    color: colors.text.tertiary,
  },
  logoutButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.background.tertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.xl,
    gap: spacing.base,
    paddingBottom: spacing['3xl'],
  },
  center: {
    paddingVertical: spacing['5xl'],
    alignItems: 'center',
  },
  errorBanner: {
    color: colors.error[600],
    fontSize: typography.size.sm,
  },

  // Hors inscription / erreur
  heroCard: {
    backgroundColor: colors.background.primary,
    borderRadius: 20,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.md,
    ...shadows.sm,
  },
  heroTitle: {
    fontSize: typography.size.xl,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
  },
  heroText: {
    fontSize: typography.size.sm,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: typography.size.sm * typography.lineHeight.normal,
  },
  primaryButton: {
    alignSelf: 'stretch',
    backgroundColor: colors.primary[600],
    borderRadius: 12,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: colors.text.inverse,
    fontWeight: typography.weight.semibold,
    fontSize: typography.size.base,
  },
  secondaryButton: {
    alignSelf: 'stretch',
    borderRadius: 12,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  secondaryButtonText: {
    color: colors.text.primary,
    fontWeight: typography.weight.medium,
  },

  // Prochaine leçon
  nextCard: {
    backgroundColor: colors.primary[600],
    borderRadius: 20,
    padding: spacing.xl,
    ...shadows.md,
  },
  nextLabel: {
    color: colors.primary[100],
    fontSize: typography.size.xs,
    fontWeight: typography.weight.semibold,
    letterSpacing: 1,
    marginBottom: spacing.sm,
  },
  nextRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  nextTitle: {
    color: colors.text.inverse,
    fontSize: typography.size['2xl'],
    fontWeight: typography.weight.bold,
  },
  countdownPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.primary[50],
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  countdownText: {
    color: colors.primary[700],
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
  },
  nextWhen: {
    color: colors.text.inverse,
    fontSize: typography.size.base,
    marginTop: spacing.sm,
  },
  nextMeta: {
    color: colors.primary[100],
    fontSize: typography.size.sm,
    marginTop: spacing.xs,
  },
  nextActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  inverseButton: {
    backgroundColor: colors.background.primary,
    borderRadius: 12,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.lg,
  },
  inverseButtonText: {
    color: colors.primary[700],
    fontWeight: typography.weight.semibold,
  },
  ghostButton: {
    borderRadius: 12,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
    borderColor: colors.primary[300],
  },
  ghostButtonText: {
    color: colors.text.inverse,
    fontWeight: typography.weight.medium,
  },

  // Parcours
  card: {
    backgroundColor: colors.background.primary,
    borderRadius: 20,
    padding: spacing.xl,
    ...shadows.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.base,
  },
  cardTitle: {
    fontSize: typography.size.lg,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
  },
  cardLink: {
    fontSize: typography.size.sm,
    color: colors.primary[600],
    fontWeight: typography.weight.medium,
  },
  stepRow: {
    flexDirection: 'row',
  },
  stepRail: {
    width: 36,
    alignItems: 'center',
  },
  stepDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.background.tertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDotCurrent: {
    backgroundColor: colors.primary[50],
    borderWidth: 2,
    borderColor: colors.primary[600],
  },
  stepDotDone: {
    backgroundColor: colors.success[50],
  },
  stepLine: {
    flex: 1,
    width: 2,
    minHeight: spacing.base,
    backgroundColor: colors.border.default,
    marginVertical: spacing.xs,
  },
  stepLineDone: {
    backgroundColor: colors.success[500],
  },
  stepBody: {
    flex: 1,
    marginLeft: spacing.md,
    paddingBottom: spacing.lg,
  },
  stepBodyCurrent: {
    backgroundColor: colors.primary[50],
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
    paddingBottom: spacing.md,
  },
  stepTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  stepTitle: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
  },
  stepTitleMuted: {
    color: colors.text.tertiary,
  },
  currentPill: {
    backgroundColor: colors.primary[600],
    borderRadius: 999,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  currentPillText: {
    color: colors.text.inverse,
    fontSize: typography.size.xs,
    fontWeight: typography.weight.semibold,
  },
  stepDetail: {
    fontSize: typography.size.sm,
    color: colors.text.secondary,
    marginTop: 2,
  },

  // Dû / avoir
  tilesRow: {
    flexDirection: 'row',
    gap: spacing.base,
  },
  tile: {
    flex: 1,
    backgroundColor: colors.background.primary,
    borderRadius: 16,
    padding: spacing.lg,
    ...shadows.sm,
  },
  tileLabel: {
    fontSize: typography.size.sm,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  tileValue: {
    fontSize: typography.size.xl,
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
  },
  tileValueDue: {
    color: colors.warning[600],
  },
  tileValueCredit: {
    color: colors.success[600],
  },

  // Actions
  actionsRow: {
    flexDirection: 'row',
    gap: spacing.base,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary[600],
    borderRadius: 14,
    paddingVertical: spacing.md + 2,
  },
  actionButtonAlt: {
    backgroundColor: colors.primary[50],
  },
  actionText: {
    color: colors.text.inverse,
    fontWeight: typography.weight.semibold,
    fontSize: typography.size.sm,
  },
  actionTextAlt: {
    color: colors.primary[700],
  },

  // Liens
  linksRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  linkChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.background.primary,
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  linkText: {
    fontSize: typography.size.sm,
    color: colors.text.secondary,
  },
});
