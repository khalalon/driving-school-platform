/**
 * Accueil de l'élève — « Tableau de bord » (maquette C, 13.14, D-52) : scène d'accueil 3D,
 * jauge des étapes franchies et compteurs de leçons par type, prochaine session (grande heure,
 * délai, instructeur), parcours en circuit (13.11), action principale « Demander une leçon ».
 * Historique : « Mon parcours » (D-45, 8.2), refondu sur le système (11.3).
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
  LessonType,
  canStudentCancel,
} from '../../models/Lesson';
import { Exam } from '../../models/Exam';
import { FinancialSummary, MyProfile } from '../../models/Profile';
import { JourneyStep, JourneyStepKey, buildJourney } from '../../models/Journey';
import { useSchoolCurrency } from '../../hooks/useSchoolCurrency';
import {
  formatAmount,
  formatCountdown,
  formatDate,
  formatPersonName,
  formatTime,
  initialsOf,
} from '../../utils/format';
import { Theme, textStyle } from '../../theme';
import type { Language } from '../../i18n';
import { IoniconName } from '../../utils/rtl';
import { Scene3D } from '../../components/three/Scene3D';
import { HomeCarScene } from '../../components/three/HomeCarScene';
import { HomeCarFallback } from '../../components/three/HomeCarFallback';
import { homeCarPalette } from '../../components/three/homeCar';
import { JourneyTrackScene } from '../../components/three/JourneyTrackScene';
import {
  carSectorIndex,
  journeySectors,
  journeyTrackPalette,
} from '../../components/three/journeyTrack';
import { Gauge, SectorBar, StatRow, TimeBlock } from '../../components/circuit';
import { CelebrationModal } from '../../components/celebration/CelebrationModal';
import { useCelebrations } from '../../hooks/useCelebrations';

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
  const { t, language } = useI18n();
  const { user } = useAuth();
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme, language), [theme, language]);
  // `undefined` = pas encore chargé, `null` = aucune inscription approuvée
  const [enrollment, setEnrollment] = useState<EnrollmentRequest | null | undefined>(undefined);
  const [data, setData] = useState<HomeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** Étape ouverte dans le parcours (13.11) ; par défaut l'étape en cours. */
  const [selectedStep, setSelectedStep] = useState<JourneyStepKey | null>(null);
  /** Événements à fêter (13.12) : inscription acceptée, code réussi, permis obtenu. */
  const celebration = useCelebrations(enrollment, data?.exams);
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
      <Card highlighted style={styles.nextCard} testID="next-lesson">
        {next ? (
          <>
            <TimeBlock
              kicker={t('home.nextLesson')}
              time={formatTime(next.scheduledDate)}
              line={[
                formatDate(next.scheduledDate),
                lessonTypeLabel(next.type),
                next.durationMinutes ? t('format.minutes', { count: next.durationMinutes }) : null,
              ]
                .filter(Boolean)
                .join(' · ')}
              trailing={
                <>
                  <Badge label={formatCountdown(next.scheduledDate)} tone="accent" dot />
                  <Text style={styles.nextMeta} numberOfLines={1}>
                    {formatPersonName(next.instructor, t('home.yourInstructor'))}
                  </Text>
                </>
              }
            />
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
            <Text style={styles.nextLabel}>{t('home.nextLesson')}</Text>
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

  /** Détail d'une étape : son état, son avancement et l'action qui la fait progresser. */
  const renderStepDetail = (step: JourneyStep) => {
    const state = journeySectors([step])[0].state;
    const tone = state === 'done' ? 'accent' : state === 'current' ? 'telemetry' : 'neutral';
    return (
      <View style={styles.stepDetailCard} testID={`journey-detail-${step.key}`}>
        <View style={styles.stepTitleRow}>
          <Text style={styles.stepTitle}>{step.title}</Text>
          <Badge label={t(`journey.state.${state}`)} tone={tone} dot />
        </View>
        <Text style={styles.stepDetail}>{step.detail}</Text>
        {step.state !== 'done' ? (
          <Button
            title={t(
              step.kind === 'exam' ? 'journey.detail.requestExam' : 'journey.detail.requestLesson'
            )}
            onPress={step.kind === 'exam' ? () => navigation.navigate('RequestExam') : requestLesson}
            variant={step.state === 'current' ? 'primary' : 'secondary'}
            size="sm"
            icon={step.kind === 'exam' ? 'ribbon-outline' : 'calendar-outline'}
          />
        ) : null}
      </View>
    );
  };

  /** Jauge des étapes franchies et leçons effectuées par type (P8 `completedLessonsByType`). */
  const renderProgress = (home: HomeData, steps: JourneyStep[]) => {
    const done = steps.filter((step) => step.state === 'done').length;
    const counts = home.profile?.completedLessonsByType;
    return (
      <Card testID="progress-card">
        {enrollment?.schoolName ? (
          <Text style={styles.progressSchool} numberOfLines={1}>
            {enrollment.schoolName}
          </Text>
        ) : null}
        <View style={styles.progressRow}>
          <Gauge
            value={done}
            max={steps.length}
            caption={t('home.stepsCaption')}
            accessibilityLabel={t('home.stepsA11y', { done, total: steps.length })}
            size={156}
          />
          <View style={styles.progressStats}>
            {[LessonType.CODE, LessonType.MANOEUVRE, LessonType.PARC].map((type) => (
              <StatRow key={type} label={lessonTypeLabel(type)} value={counts?.[type] ?? 0} />
            ))}
          </View>
        </View>
      </Card>
    );
  };

  const renderJourney = (steps: JourneyStep[]) => {
    const sectors = journeySectors(steps);
    const carSector = carSectorIndex(steps);
    const openKey =
      selectedStep ?? steps[carSector ?? steps.length - 1]?.key ?? steps[0]?.key ?? null;
    const openStep = steps.find((step) => step.key === openKey) ?? null;
    return (
      <Card>
        <SectionHeader
          title={t('home.myJourney')}
          action={{ label: t('home.myExams'), onPress: () => navigation.navigate('MyExams') }}
          style={styles.journeyHeader}
        />
        <Scene3D
          height={200}
          fallbackHeight={0}
          accessibilityLabel={t('journey.scene3d')}
          style={styles.journeyScene}
          testID="journey-track-scene"
          fallback={<View style={styles.journeySceneFallback} />}
        >
          <JourneyTrackScene
            sectors={sectors.map(({ key, state }) => ({ key, state }))}
            carSector={carSector}
            selectedKey={openKey}
            palette={journeyTrackPalette(theme)}
            onSelect={(key) => setSelectedStep(key as JourneyStepKey)}
          />
        </Scene3D>
        <SectorBar
          sectors={sectors}
          selectedKey={openKey}
          onSelect={(key) => setSelectedStep(key as JourneyStepKey)}
          style={styles.journeySectors}
          testID="journey-sectors"
        />
        {openStep ? renderStepDetail(openStep) : null}
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
    const steps = buildJourney(data.profile?.completedLessonsByType, data.exams, data.lessons);
    return (
      <>
        {error ? <Text style={styles.errorBanner}>{error}</Text> : null}
        {renderProgress(data, steps)}
        {renderNextLesson(data.lessons)}
        {renderJourney(steps)}
        {renderActions()}
        {renderMoney(data.financial)}
        {renderLinks()}
      </>
    );
  };

  return (
    <View style={styles.flex}>
      <CelebrationModal celebration={celebration.current} onContinue={celebration.dismiss} />
      <AppBar
        title={`${t('home.hello')} ${user?.firstName || t('home.student')}`}
        subtitle={t('home.dashboard')}
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
        <Scene3D
          height={210}
          accessibilityLabel={t('home.scene3d')}
          style={styles.scene}
          testID="home-car-scene"
          fallback={<HomeCarFallback />}
        >
          <HomeCarScene palette={homeCarPalette(theme)} />
        </Scene3D>
        {renderBody()}
      </Screen>
    </View>
  );
};

const createStyles = (theme: Theme, language: Language) =>
  StyleSheet.create({
    flex: { flex: 1, backgroundColor: theme.colors.surface },
    content: { paddingTop: theme.spacing.base, gap: theme.spacing.base },
    scene: {
      borderRadius: theme.radius.lg,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surfaceRaised,
    },
    skeletons: { gap: theme.spacing.base },

    // Jauge et compteurs
    progressSchool: {
      ...textStyle('label', language),
      color: theme.colors.textSecondary,
      marginBottom: theme.spacing.sm,
    },
    progressRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md },
    progressStats: { flex: 1, gap: theme.spacing.xs },

    // Prochaine session
    nextCard: { gap: theme.spacing.xs },
    nextLabel: { ...textStyle('label', language), color: theme.colors.signalText },
    nextTitle: { ...textStyle('title', language), color: theme.colors.textPrimary },
    nextMeta: { ...textStyle('caption', language), color: theme.colors.textSecondary },
    nextActions: {
      flexDirection: 'row',
      gap: theme.spacing.sm,
      marginTop: theme.spacing.md,
      flexWrap: 'wrap',
    },

    // Parcours
    journeyHeader: { marginBottom: theme.spacing.md },
    journeyScene: {
      borderRadius: theme.radius.md,
      marginBottom: theme.spacing.md,
      backgroundColor: theme.colors.surfaceRaised,
    },
    // Repli de la scène : la barre de secteurs, juste dessous, porte déjà tout le parcours
    journeySceneFallback: { flex: 1, backgroundColor: theme.colors.surfaceMuted },
    journeySectors: { marginBottom: theme.spacing.md },
    stepDetailCard: {
      gap: theme.spacing.sm,
      padding: theme.spacing.md,
      borderRadius: theme.radius.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
    },
    stepTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: theme.spacing.sm,
    },
    stepTitle: { ...textStyle('heading', language), color: theme.colors.textPrimary, flexShrink: 1 },
    stepDetail: { ...textStyle('body', language), color: theme.colors.textSecondary },

    // Dû et avoir
    tilesRow: { flexDirection: 'row', gap: theme.spacing.md },
    tile: { flex: 1, gap: theme.spacing.xs },
    tileLabel: { ...textStyle('label', language), color: theme.colors.textSecondary },
    tileValue: {
      ...textStyle('numeric', language),
      fontSize: 26,
      lineHeight: 30,
      color: theme.colors.textPrimary,
    },
    tileValueDue: { color: theme.colors.dangerText },
    tileValueCredit: { color: theme.colors.successText },

    // Actions et raccourcis
    actionsRow: { flexDirection: 'row', gap: theme.spacing.md },
    action: { flex: 1 },
    linksRow: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm },

    errorBanner: {
      ...textStyle('body', language),
      color: theme.colors.dangerText,
      backgroundColor: theme.colors.dangerSoft,
      borderRadius: theme.radius.md,
      padding: theme.spacing.md,
    },
  });
