/**
 * Accueil de l'instructeur — « Aujourd'hui » (D-45, 8.3), refondu sur le système (11.4).
 * Single Responsibility: l'accueil de l'instructeur montre sa journée et ce qui l'attend.
 *
 * Bandeau des demandes (L1 `scope=school` pending, X1 pending, E4 pending), timeline du jour
 * (L1 `scope=mine`, jour local) avec la leçon en cours mise en avant et la présence pointée
 * depuis la carte (L7, modale partagée), examens du jour (X1), charge des 7 prochains jours.
 * Cloisonné à l'école de l'instructeur : `schoolId` vient de A3 (D-19, D-20).
 */

import React, { useCallback, useMemo, useState } from 'react';
import { Alert, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
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
import { lessonService } from '../../services/api/LessonService';
import { examService } from '../../services/api/ExamService';
import { enrollmentService } from '../../services/api/EnrollmentService';
import { getApiErrorMessage } from '../../services/api/ApiError';
import { EnrollmentStatus } from '../../models/Enrollment';
import {
  lessonTypeLabel,
  Lesson,
  LessonStatus,
  LessonType,
  MarkAttendanceData,
  pickCurrentLesson,
} from '../../models/Lesson';
import { examTypeLabel, Exam, ExamStatus } from '../../models/Exam';
import { dateLocale, formatPersonName, formatTime, toLocalDateKey } from '../../utils/format';
import { Theme } from '../../theme';
import { MIN_TOUCH_TARGET } from '../../theme/tokens';
import { IoniconName, mirrorIcon } from '../../utils/rtl';
import { AttendanceModal } from './components/AttendanceModal';

interface TodayData {
  today: Lesson[];
  week: Lesson[];
  pendingLessons: Lesson[];
  exams: Exam[];
  pendingEnrollments: number;
}

const WEEK_DAYS = 7;

/** Les 7 prochains jours (aujourd'hui compris) avec le nombre de leçons planifiées chacun. */
const weekLoad = (lessons: Lesson[], from: Date = new Date()) =>
  Array.from({ length: WEEK_DAYS }, (_, offset) => {
    const day = new Date(from);
    day.setDate(from.getDate() + offset);
    const key = toLocalDateKey(day);
    return {
      key,
      // Jour de la semaine dans la langue du téléphone
      label: day.toLocaleDateString(dateLocale(), { weekday: 'short' }),
      count: lessons.filter(
        (l) => l.scheduledDate && toLocalDateKey(new Date(l.scheduledDate)) === key
      ).length,
    };
  });

export const InstructorDashboard = ({ navigation }: any) => {
  const { t } = useI18n();
  const { user, logout } = useAuth();
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const schoolId = user?.schoolId ?? null;
  const [data, setData] = useState<TodayData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  // Présence depuis la carte (L7) : leçon sélectionnée + choix pré-rempli
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [initialAttended, setInitialAttended] = useState(true);

  const load = useCallback(async () => {
    try {
      setError(null);
      const todayKey = toLocalDateKey();
      const [today, week, pendingLessons, exams, enrollments] = await Promise.all([
        lessonService.getMyLessons({
          status: [LessonStatus.SCHEDULED, LessonStatus.COMPLETED],
          scope: 'mine',
          date: todayKey,
        }),
        lessonService.getMyLessons({ status: [LessonStatus.SCHEDULED], scope: 'mine' }),
        lessonService.getMyLessons({ status: [LessonStatus.PENDING], scope: 'school' }),
        examService.getMyExams({ status: [ExamStatus.PENDING, ExamStatus.SCHEDULED] }),
        schoolId
          ? enrollmentService.getSchoolRequests(schoolId, EnrollmentStatus.PENDING)
          : Promise.resolve([]),
      ]);
      setData({ today, week, pendingLessons, exams, pendingEnrollments: enrollments.length });
    } catch (err) {
      setError(getApiErrorMessage(err, t('today.loadFailed')));
    } finally {
      setLoading(false);
    }
  }, [schoolId]);

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
    // Pas de navigation : AuthContext reconstruit le navigateur
  };

  /** Écran cloisonné à l'école de l'instructeur : `schoolId` vient de A3 (D-19). */
  const openEnrollmentRequests = () => {
    if (!schoolId) {
      Alert.alert(t('today.noSchool'), t('today.noSchoolText'));
      return;
    }
    navigation.navigate('EnrollmentRequests', { schoolId });
  };

  const openAttendance = (lesson: Lesson, attended: boolean) => {
    setInitialAttended(attended);
    setSelectedLesson(lesson);
  };

  const confirmAttendance = async (payload: MarkAttendanceData) => {
    if (!selectedLesson) return;
    try {
      setProcessing(true);
      // L7 : par identifiant de leçon, uniquement par son instructeur
      await lessonService.markAttendance(selectedLesson.id, payload);
      setSelectedLesson(null);
      load();
    } catch (err) {
      Alert.alert(t('common.error'), getApiErrorMessage(err, t('today.attendanceFailed')));
    } finally {
      setProcessing(false);
    }
  };

  /** Ce qui attend une réponse : une ligne par file, masquée quand elle est vide. */
  const renderRequests = (home: TodayData) => {
    const lessons = home.pendingLessons.length;
    const codes = home.pendingLessons.filter((l) => l.type === LessonType.CODE).length;
    const exams = home.exams.filter((e) => e.status === ExamStatus.PENDING).length;
    const enrollments = home.pendingEnrollments;

    if (lessons + exams + enrollments === 0) {
      return (
        <Card style={styles.quiet} elevation="none">
          <Ionicons name="checkmark-done" size={18} color={theme.colors.successText} />
          <Text style={styles.quietText}>{t('today.noRequests')}</Text>
        </Card>
      );
    }

    const rows = [
      lessons > 0 && {
        key: 'lessons',
        icon: 'time-outline' as IoniconName,
        text:
          lessons === 1
            ? t('today.lessonRequestOne')
            : t('today.lessonRequestMany', { count: lessons }),
        hint: codes >= 2 ? t('today.codesTogether', { count: codes }) : null,
        onPress: () => navigation.navigate('LessonRequests'),
      },
      exams > 0 && {
        key: 'exams',
        icon: 'ribbon-outline' as IoniconName,
        text:
          exams === 1 ? t('today.examRequestOne') : t('today.examRequestMany', { count: exams }),
        hint: null,
        onPress: () => navigation.navigate('ExamRequests'),
      },
      enrollments > 0 && {
        key: 'enrollments',
        icon: 'people-outline' as IoniconName,
        text:
          enrollments === 1
            ? t('today.enrollmentRequestOne')
            : t('today.enrollmentRequestMany', { count: enrollments }),
        hint: null,
        onPress: openEnrollmentRequests,
      },
    ].filter(Boolean) as {
      key: string;
      icon: IoniconName;
      text: string;
      hint: string | null;
      onPress: () => void;
    }[];

    return (
      <Card style={styles.requests} padded={false}>
        {rows.map((row) => (
          <Pressable
            key={row.key}
            onPress={row.onPress}
            accessibilityRole="button"
            accessibilityLabel={row.text}
            style={({ pressed }) => [styles.requestRow, pressed && styles.pressed]}
          >
            <Ionicons name={row.icon} size={20} color={theme.colors.warningText} />
            <View style={styles.requestBody}>
              <Text style={styles.requestText}>{row.text}</Text>
              {row.hint ? <Text style={styles.requestHint}>{row.hint}</Text> : null}
            </View>
            <Ionicons
              name={mirrorIcon('chevron-forward')}
              size={18}
              color={theme.colors.warningText}
            />
          </Pressable>
        ))}
      </Card>
    );
  };

  const renderLesson = (lesson: Lesson, current: Lesson | null, isLast: boolean) => {
    const isCurrent = current?.id === lesson.id;
    const isDone = lesson.status === LessonStatus.COMPLETED;
    // Planifiée mais déjà passée sans présence pointée : à enregistrer (L7 reste possible)
    const isOverdue =
      !isDone &&
      !isCurrent &&
      lesson.status === LessonStatus.SCHEDULED &&
      !!lesson.scheduledDate &&
      new Date(lesson.scheduledDate).getTime() + (lesson.durationMinutes ?? 60) * 60000 <=
        Date.now();
    const canRecord = isCurrent || isOverdue;
    const dotStyle = isDone
      ? lesson.attended === false
        ? styles.dotAbsent
        : styles.dotDone
      : isCurrent
        ? styles.dotCurrent
        : styles.dotIdle;

    return (
      <View key={lesson.id} style={styles.timelineRow}>
        <View style={styles.timeColumn}>
          <Text style={[styles.time, isCurrent && styles.timeCurrent]} numberOfLines={1}>
            {formatTime(lesson.scheduledDate)}
          </Text>
        </View>

        <View style={styles.rail}>
          <View style={[styles.dot, dotStyle]} />
          {!isLast ? <View style={styles.railLine} /> : null}
        </View>

        <View style={[styles.lessonCard, isCurrent && styles.lessonCardCurrent]}>
          <View style={styles.lessonTop}>
            <Text style={styles.studentName}>
              {formatPersonName(lesson.student, t('today.student'))}
            </Text>
            {isDone ? (
              <Badge
                label={lesson.attended === false ? t('today.absent') : t('today.done')}
                tone={lesson.attended === false ? 'danger' : 'success'}
              />
            ) : isCurrent ? (
              <Badge label={t('today.now')} tone="accent" dot />
            ) : isOverdue ? (
              <Badge label={t('today.toRecord')} tone="warning" />
            ) : null}
          </View>

          <Text style={styles.lessonMeta}>
            {lessonTypeLabel(lesson.type) ?? lesson.type}
            {lesson.durationMinutes
              ? ` · ${t('format.minutes', { count: lesson.durationMinutes })}`
              : ''}
          </Text>

          {canRecord ? (
            <View style={styles.attendanceRow}>
              <Button
                title={t('today.present')}
                onPress={() => openAttendance(lesson, true)}
                size="sm"
                icon="checkmark-circle"
                style={styles.attendanceButton}
              />
              <Button
                title={t('today.absent')}
                onPress={() => openAttendance(lesson, false)}
                variant="secondary"
                size="sm"
                icon="close-circle"
                style={styles.attendanceButton}
              />
            </View>
          ) : null}
        </View>
      </View>
    );
  };

  const renderTimeline = (home: TodayData) => {
    const lessons = [...home.today].sort((a, b) =>
      (a.scheduledDate ?? '').localeCompare(b.scheduledDate ?? '')
    );
    const current = pickCurrentLesson(lessons);

    return (
      <Card>
        <SectionHeader
          title={t('today.yourLessons')}
          action={{
            label: t('today.fullList'),
            onPress: () => navigation.navigate('TodayLessons'),
          }}
          style={styles.sectionHeader}
        />
        {lessons.length === 0 ? (
          <EmptyState
            icon="cafe-outline"
            title={t('today.noLessons')}
            tone="neutral"
            action={{
              label: t('today.bookForStudent'),
              onPress: () => navigation.navigate('BookForStudent'),
            }}
          />
        ) : (
          lessons.map((lesson, index) =>
            renderLesson(lesson, current, index === lessons.length - 1)
          )
        )}
      </Card>
    );
  };

  const renderExams = (home: TodayData) => {
    const todayKey = toLocalDateKey();
    const exams = home.exams.filter(
      (e) =>
        e.status === ExamStatus.SCHEDULED &&
        e.dateTime &&
        toLocalDateKey(new Date(e.dateTime)) === todayKey
    );
    if (exams.length === 0) return null;

    return (
      <Card>
        <SectionHeader
          title={t('today.examsToday')}
          action={{
            label: t('today.recordResults'),
            onPress: () => navigation.navigate('TodayExams'),
          }}
          style={styles.sectionHeader}
        />
        {exams.map((exam) => (
          <Pressable
            key={exam.id}
            onPress={() => navigation.navigate('TodayExams')}
            accessibilityRole="button"
            style={({ pressed }) => [styles.examRow, pressed && styles.pressed]}
          >
            <Text style={styles.time} numberOfLines={1}>
              {formatTime(exam.dateTime)}
            </Text>
            <View style={styles.examBody}>
              <Text style={styles.studentName}>
                {formatPersonName(
                  { firstName: exam.studentFirstName, lastName: exam.studentLastName },
                  t('today.student')
                )}
              </Text>
              <Text style={styles.lessonMeta}>
                {t('today.examWithType', { type: examTypeLabel(exam.type) })}
                {exam.location ? ` · ${exam.location}` : ''}
              </Text>
            </View>
            <Badge label={t('today.result')} tone="accent" />
          </Pressable>
        ))}
      </Card>
    );
  };

  const renderWeek = (home: TodayData) => {
    const days = weekLoad(home.week);
    const max = Math.max(1, ...days.map((d) => d.count));
    const total = days.reduce((sum, d) => sum + d.count, 0);

    return (
      <Card>
        <SectionHeader
          title={t('today.next7days')}
          subtitle={
            total === 1 ? t('today.lessonCountOne') : t('today.lessonCountMany', { count: total })
          }
          style={styles.sectionHeader}
        />
        <View style={styles.weekRow}>
          {days.map((day, index) => (
            <View key={day.key} style={styles.weekDay}>
              <Text style={styles.weekCount}>{day.count > 0 ? day.count : ''}</Text>
              <View style={styles.barTrack}>
                <View
                  style={[
                    styles.bar,
                    index === 0 && styles.barToday,
                    { height: `${Math.max(6, (day.count / max) * 100)}%` },
                  ]}
                />
              </View>
              <Text style={[styles.weekLabel, index === 0 && styles.weekLabelToday]}>
                {day.label}
              </Text>
            </View>
          ))}
        </View>
      </Card>
    );
  };

  const renderLinks = () => (
    <View style={styles.linksRow}>
      {(
        [
          {
            label: t('today.link.bookForStudent'),
            icon: 'add-circle-outline',
            route: 'BookForStudent',
          },
          {
            label: t('today.link.enrollments'),
            icon: 'people-outline',
            route: 'EnrollmentRequests',
          },
          { label: t('today.link.todayExams'), icon: 'ribbon-outline', route: 'TodayExams' },
          { label: t('today.link.examRequests'), icon: 'clipboard-outline', route: 'ExamRequests' },
        ] as { label: string; icon: IoniconName; route: string }[]
      ).map((link) => (
        <Chip
          key={link.route}
          label={link.label}
          icon={link.icon}
          tone="neutral"
          onPress={() =>
            link.route === 'EnrollmentRequests'
              ? openEnrollmentRequests()
              : navigation.navigate(link.route)
          }
        />
      ))}
    </View>
  );

  const renderBody = () => {
    if (loading && !data) {
      return (
        <>
          <SkeletonCard lines={2} />
          <SkeletonCard lines={4} />
          <SkeletonCard lines={2} />
        </>
      );
    }
    if (!data) {
      return (
        <Card>
          <EmptyState
            icon="cloud-offline-outline"
            title={t('today.nothingYet')}
            message={error ?? undefined}
            tone="danger"
            action={{ label: t('common.retry'), onPress: load }}
          />
        </Card>
      );
    }
    return (
      <>
        {error ? <Text style={styles.errorBanner}>{error}</Text> : null}
        {renderRequests(data)}
        {renderTimeline(data)}
        {renderExams(data)}
        {renderWeek(data)}
        {renderLinks()}
      </>
    );
  };

  const now = new Date();

  return (
    <View style={styles.flex}>
      <AppBar
        title={t('today.title')}
        subtitle={now.toLocaleDateString(dateLocale(), {
          weekday: 'long',
          month: 'short',
          day: 'numeric',
        })}
        large
        right={
          <Pressable
            onPress={handleLogout}
            accessibilityRole="button"
            accessibilityLabel={t('common.logout')}
            hitSlop={8}
            style={styles.logout}
          >
            <Ionicons name="log-out-outline" size={22} color={theme.colors.textSecondary} />
          </Pressable>
        }
      />

      <Screen
        contentContainerStyle={styles.content}
        edges={[]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[theme.colors.accent]}
            tintColor={theme.colors.accent}
          />
        }
      >
        {renderBody()}
      </Screen>

      <AttendanceModal
        lesson={selectedLesson}
        initialAttended={initialAttended}
        processing={processing}
        onClose={() => setSelectedLesson(null)}
        onConfirm={confirmAttendance}
      />
    </View>
  );
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    flex: { flex: 1, backgroundColor: theme.colors.surface },
    content: { paddingTop: theme.spacing.base, gap: theme.spacing.base },
    logout: {
      width: MIN_TOUCH_TARGET,
      height: MIN_TOUCH_TARGET,
      borderRadius: theme.radius.pill,
      backgroundColor: theme.colors.surfaceMuted,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sectionHeader: { marginBottom: theme.spacing.md },
    pressed: { opacity: 0.7 },

    // Files d'attente
    quiet: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
    quietText: { fontSize: theme.typography.size.sm, color: theme.colors.successText },
    requests: { backgroundColor: theme.colors.warningSoft, borderColor: theme.colors.warning },
    requestRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.md,
      paddingHorizontal: theme.spacing.base,
      paddingVertical: theme.spacing.md,
      minHeight: MIN_TOUCH_TARGET,
    },
    requestBody: { flex: 1, gap: 2 },
    requestText: {
      fontSize: theme.typography.size.sm,
      fontWeight: theme.typography.weight.medium,
      color: theme.colors.warningText,
    },
    requestHint: { fontSize: theme.typography.size.xs, color: theme.colors.warningText },

    // Timeline du jour
    timelineRow: { flexDirection: 'row', gap: theme.spacing.sm },
    timeColumn: { width: 56, paddingTop: 2 },
    time: { fontSize: theme.typography.size.sm, color: theme.colors.textSecondary },
    timeCurrent: {
      color: theme.colors.accentText,
      fontWeight: theme.typography.weight.semibold,
    },
    rail: { width: 16, alignItems: 'center' },
    dot: { width: 12, height: 12, borderRadius: 6, marginTop: 5 },
    dotDone: { backgroundColor: theme.colors.success },
    dotAbsent: { backgroundColor: theme.colors.danger },
    dotCurrent: { backgroundColor: theme.colors.accent },
    dotIdle: { backgroundColor: theme.colors.borderStrong },
    railLine: { flex: 1, width: 2, backgroundColor: theme.colors.border, marginVertical: 2 },
    lessonCard: {
      flex: 1,
      paddingBottom: theme.spacing.lg,
      gap: theme.spacing.xs,
    },
    lessonCardCurrent: {},
    lessonTop: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: theme.spacing.sm,
    },
    studentName: {
      flexShrink: 1,
      fontSize: theme.typography.size.base,
      fontWeight: theme.typography.weight.semibold,
      color: theme.colors.textPrimary,
    },
    lessonMeta: { fontSize: theme.typography.size.sm, color: theme.colors.textSecondary },
    attendanceRow: { flexDirection: 'row', gap: theme.spacing.sm, marginTop: theme.spacing.xs },
    attendanceButton: { flex: 1 },

    // Examens du jour
    examRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
      paddingVertical: theme.spacing.md,
      minHeight: MIN_TOUCH_TARGET,
    },
    examBody: { flex: 1, gap: 2 },

    // Charge de la semaine
    weekRow: { flexDirection: 'row', gap: theme.spacing.xs, height: 120 },
    weekDay: { flex: 1, alignItems: 'center', gap: theme.spacing.xs },
    weekCount: { fontSize: theme.typography.size.xs, color: theme.colors.textSecondary },
    barTrack: { flex: 1, width: '60%', justifyContent: 'flex-end' },
    bar: {
      width: '100%',
      borderRadius: theme.radius.sm,
      backgroundColor: theme.colors.accentSoft,
    },
    barToday: { backgroundColor: theme.colors.accent },
    weekLabel: { fontSize: theme.typography.size.xs, color: theme.colors.textMuted },
    weekLabelToday: {
      color: theme.colors.accentText,
      fontWeight: theme.typography.weight.semibold,
    },

    linksRow: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm },
    errorBanner: {
      fontSize: theme.typography.size.sm,
      color: theme.colors.dangerText,
      backgroundColor: theme.colors.dangerSoft,
      borderRadius: theme.radius.md,
      padding: theme.spacing.md,
    },
  });
