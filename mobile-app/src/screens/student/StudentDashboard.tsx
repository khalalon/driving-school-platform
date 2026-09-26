/**
 * Accueil de l'élève — « Mon parcours » (D-45, 8.2), refondu sur le système (11.3).
 * Single Responsibility: l'accueil de l'élève raconte son parcours.
 *
 * L'école active est celle de l'inscription approuvée (une seule, D-22), retrouvée par E3 à
 * chaque retour sur l'écran. Ensuite : prochaine leçon (L1), parcours (P8 + X1 + L1, règles
 * pures dans `models/Journey.ts`), dû et avoir (P11, devise de l'école), actions L2 / X2.
 * Sans inscription approuvée : accueil réduit à la recherche d'école et au suivi des demandes.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { Alert, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { useI18n } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
import {
  AppBar,
  Badge,
  Button,
  Card,
  Chip,
  EmptyState,
  Screen,
  SectionHeader,
  SkeletonCard,
} from '../../components/ui';
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
  initialsOf,
} from '../../utils/format';
import { Theme } from '../../theme';
import { IoniconName } from '../../utils/rtl';
import { Scene3D } from '../../components/three/Scene3D';
import { ProbeScene, SHOW_3D_PROBE } from '../../components/three/ProbeScene';

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
  const { user } = useAuth();
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
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

  const renderNextLesson = (lessons: Lesson[]) => {
    const next = findNextLesson(lessons);
    const pendingCount = lessons.filter((l) => l.status === LessonStatus.PENDING).length;

    return (
      <Card highlighted style={styles.nextCard}>
        <View style={styles.nextHead}>
          <Text style={styles.nextLabel}>{t('home.nextLesson')}</Text>
          {next ? <Badge label={formatCountdown(next.scheduledDate)} tone="accent" dot /> : null}
        </View>

        {next ? (
          <>
            <Text style={styles.nextTitle}>{lessonTypeLabel(next.type)}</Text>
            <Text style={styles.nextWhen}>
              {formatDate(next.scheduledDate)} · {formatTime(next.scheduledDate)}
              {next.durationMinutes
                ? ` · ${t('format.minutes', { count: next.durationMinutes })}`
                : ''}
            </Text>
            <Text style={styles.nextMeta}>
              {t('home.withInstructor', {
                name: formatPersonName(next.instructor, t('home.yourInstructor')),
              })}
            </Text>
            <View style={styles.nextActions}>
              <Button
                title={t('home.allLessons')}
                onPress={() => navigation.navigate('MyLessons')}
                variant="secondary"
                size="sm"
              />
              {canStudentCancel(next) ? (
                <Button
                  title={t('home.cancel')}
                  onPress={() => handleCancelLesson(next)}
                  variant="ghost"
                  size="sm"
                />
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
              <Button title={t('home.requestLesson')} onPress={requestLesson} size="sm" />
              {pendingCount > 0 ? (
                <Button
                  title={t('home.myRequests')}
                  onPress={() => navigation.navigate('MyLessons')}
                  variant="ghost"
                  size="sm"
                />
              ) : null}
            </View>
          </>
        )}
      </Card>
    );
  };

  const renderStep = (step: JourneyStep, index: number, count: number) => {
    const isLast = index === count - 1;
    const icon: IoniconName =
      step.state === 'done' ? 'checkmark-circle' : step.kind === 'exam' ? 'ribbon' : 'car';
    const iconColor =
      step.state === 'done'
        ? theme.colors.success
        : step.state === 'current'
          ? theme.colors.signal
          : step.state === 'started'
            ? theme.colors.warning
            : theme.colors.textMuted;

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
            <Ionicons name={icon} size={18} color={iconColor} />
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
            {step.state === 'current' ? <Badge label={t('home.now')} tone="accent" /> : null}
          </View>
          <Text style={styles.stepDetail}>{step.detail}</Text>
        </View>
      </View>
    );
  };

  const renderJourney = (home: HomeData) => {
    const steps = buildJourney(home.profile?.completedLessonsByType, home.exams, home.lessons);
    return (
      <Card>
        <SectionHeader
          title={t('home.myJourney')}
          action={{ label: t('home.myExams'), onPress: () => navigation.navigate('MyExams') }}
          style={styles.journeyHeader}
        />
        {steps.map((step, index) => renderStep(step, index, steps.length))}
      </Card>
    );
  };

  const renderMoney = (financial: FinancialSummary | null) => (
    <View style={styles.tilesRow}>
      <Card onPress={openMyProfile} style={styles.tile} accessibilityLabel={t('home.amountDue')}>
        <Text style={styles.tileLabel}>{t('home.amountDue')}</Text>
        <Text style={[styles.tileValue, (financial?.totalDue ?? 0) > 0 && styles.tileValueDue]}>
          {formatAmount(financial?.totalDue ?? 0, currency)}
        </Text>
      </Card>
      <Card onPress={openMyProfile} style={styles.tile} accessibilityLabel={t('home.yourCredit')}>
        <Text style={styles.tileLabel}>{t('home.yourCredit')}</Text>
        <Text style={[styles.tileValue, (financial?.credit ?? 0) > 0 && styles.tileValueCredit]}>
          {formatAmount(financial?.credit ?? 0, currency)}
        </Text>
      </Card>
    </View>
  );

  const renderActions = () => (
    <View style={styles.actionsRow}>
      <Button
        title={t('home.requestLesson')}
        onPress={requestLesson}
        icon="calendar-outline"
        style={styles.action}
      />
      <Button
        title={t('home.requestExam')}
        onPress={() => navigation.navigate('RequestExam')}
        variant="secondary"
        icon="ribbon-outline"
        style={styles.action}
      />
    </View>
  );

  const renderLinks = () => (
    <View style={styles.linksRow}>
      {(
        [
          { label: t('home.link.myLessons'), route: 'MyLessons', icon: 'list-outline' },
          { label: t('home.link.myProfile'), route: 'MyProfile', icon: 'person-outline' },
          {
            label: t('home.link.enrollment'),
            route: 'MyEnrollmentRequests',
            icon: 'school-outline',
          },
          { label: t('home.link.schools'), route: 'SchoolsList', icon: 'business-outline' },
        ] as { label: string; route: string; icon: IoniconName }[]
      ).map((link) => (
        <Chip
          key={link.route}
          label={link.label}
          icon={link.icon}
          tone="neutral"
          onPress={() =>
            link.route === 'MyProfile' ? openMyProfile() : navigation.navigate(link.route)
          }
        />
      ))}
    </View>
  );

  const renderBody = () => {
    // Tant que l'école n'est pas connue, ou que ses données arrivent, on n'annonce rien :
    // afficher « Trouvez votre auto-école » à un élève inscrit serait faux (recette 23/09).
    if (loading && !data) {
      return (
        <View style={styles.skeletons}>
          <SkeletonCard lines={3} />
          <SkeletonCard lines={4} />
          <SkeletonCard lines={1} />
        </View>
      );
    }
    if (error && !data) {
      return (
        <Card>
          <EmptyState
            icon="cloud-offline-outline"
            title={t('home.loadFailed')}
            message={error}
            tone="danger"
            action={{ label: t('common.retry'), onPress: load }}
          />
        </Card>
      );
    }
    if (!enrollment || !data) {
      return (
        <Card>
          <EmptyState
            icon="school-outline"
            title={t('home.findSchool')}
            message={t('home.findSchoolText')}
            action={{
              label: t('home.browseSchools'),
              onPress: () => navigation.navigate('SchoolsList'),
            }}
          />
          <Button
            title={t('home.enrollmentStatus')}
            onPress={() => navigation.navigate('MyEnrollmentRequests')}
            variant="ghost"
            fullWidth
          />
        </Card>
      );
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
    <View style={styles.flex}>
      <AppBar
        title={`${t('home.hello')} ${user?.firstName || t('home.student')}`}
        subtitle={enrollment?.schoolName ?? undefined}
        large
        avatar={{
          initials: initialsOf(user?.firstName, user?.lastName),
          onPress: () => navigation.navigate('Settings'),
          label: t('settings.open'),
        }}
      />
      <Screen
        contentContainerStyle={styles.content}
        edges={[]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[theme.colors.signal]}
            tintColor={theme.colors.signal}
          />
        }
      >
        {SHOW_3D_PROBE ? (
          <Scene3D
            height={200}
            accessibilityLabel={t('home.scene3d')}
            style={styles.scene}
            testID="probe-scene"
            fallback={
              <View style={styles.sceneFallback}>
                <Ionicons name="car-sport-outline" size={56} color={theme.colors.textMuted} />
              </View>
            }
          >
            <ProbeScene
              colors={{
                body: theme.colors.surfaceMuted,
                glass: theme.colors.surface,
                lights: theme.colors.signal,
                tyres: theme.colors.surface,
                ground: theme.colors.surfaceRaised,
              }}
            />
          </Scene3D>
        ) : null}
        {renderBody()}
      </Screen>
    </View>
  );
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    flex: { flex: 1, backgroundColor: theme.colors.surface },
    content: { paddingTop: theme.spacing.base, gap: theme.spacing.base },
    scene: {
      borderRadius: theme.radius.lg,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surfaceRaised,
    },
    sceneFallback: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    skeletons: { gap: theme.spacing.base },

    // Prochaine leçon
    nextCard: { gap: theme.spacing.xs },
    nextHead: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: theme.spacing.xs,
    },
    nextLabel: {
      fontSize: theme.typography.size.sm,
      color: theme.colors.signalText,
      fontWeight: theme.typography.weight.semibold,
    },
    nextTitle: {
      fontSize: theme.typography.size['2xl'],
      fontWeight: theme.typography.weight.bold,
      color: theme.colors.textPrimary,
    },
    nextWhen: { fontSize: theme.typography.size.base, color: theme.colors.textSecondary },
    nextMeta: { fontSize: theme.typography.size.sm, color: theme.colors.textMuted },
    nextActions: {
      flexDirection: 'row',
      gap: theme.spacing.sm,
      marginTop: theme.spacing.md,
      flexWrap: 'wrap',
    },

    // Parcours
    journeyHeader: { marginBottom: theme.spacing.md },
    stepRow: { flexDirection: 'row', gap: theme.spacing.md },
    stepRail: { alignItems: 'center', width: 36 },
    stepDot: {
      width: 36,
      height: 36,
      borderRadius: theme.radius.pill,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.surfaceMuted,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    stepDotCurrent: {
      backgroundColor: theme.colors.signalSoft,
      borderColor: theme.colors.signal,
    },
    stepDotDone: {
      backgroundColor: theme.colors.successSoft,
      borderColor: theme.colors.success,
    },
    stepLine: { flex: 1, width: 2, backgroundColor: theme.colors.border, marginVertical: 2 },
    stepLineDone: { backgroundColor: theme.colors.success },
    stepBody: {
      flex: 1,
      paddingBottom: theme.spacing.lg,
      gap: 2,
    },
    stepBodyCurrent: {},
    stepTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: theme.spacing.sm,
    },
    stepTitle: {
      fontSize: theme.typography.size.base,
      fontWeight: theme.typography.weight.semibold,
      color: theme.colors.textPrimary,
      flexShrink: 1,
    },
    stepTitleMuted: { color: theme.colors.textMuted, fontWeight: theme.typography.weight.medium },
    stepDetail: { fontSize: theme.typography.size.sm, color: theme.colors.textSecondary },

    // Dû et avoir
    tilesRow: { flexDirection: 'row', gap: theme.spacing.md },
    tile: { flex: 1, gap: theme.spacing.xs },
    tileLabel: { fontSize: theme.typography.size.sm, color: theme.colors.textSecondary },
    tileValue: {
      fontSize: theme.typography.size.xl,
      fontWeight: theme.typography.weight.bold,
      color: theme.colors.textPrimary,
    },
    tileValueDue: { color: theme.colors.dangerText },
    tileValueCredit: { color: theme.colors.successText },

    // Actions et raccourcis
    actionsRow: { flexDirection: 'row', gap: theme.spacing.md },
    action: { flex: 1 },
    linksRow: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm },

    errorBanner: {
      fontSize: theme.typography.size.sm,
      color: theme.colors.dangerText,
      backgroundColor: theme.colors.dangerSoft,
      borderRadius: theme.radius.md,
      padding: theme.spacing.md,
    },
  });
