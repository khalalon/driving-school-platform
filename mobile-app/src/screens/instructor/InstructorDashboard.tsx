/**
 * Instructor Dashboard — « Today » (D-45, 8.3)
 * Single Responsibility: l'accueil de l'instructeur montre sa journée et ce qui l'attend.
 *
 * Bandeau des demandes (L1 `scope=school` pending, X1 pending, E4 pending), timeline du jour
 * (L1 `scope=mine`, jour local) avec la leçon en cours mise en avant et la présence pointée
 * depuis la carte (L7, modale partagée), examens du jour (X1), charge des 7 prochains jours.
 * Cloisonné à l'école de l'instructeur : `schoolId` vient de A3 (D-19, D-20).
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
import { formatPersonName, formatTime, toLocalDateKey } from '../../utils/format';
import { colors, typography, spacing, shadows } from '../../theme';
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
      label: day.toLocaleDateString('en-US', { weekday: 'short' }),
      count: lessons.filter(
        (l) => l.scheduledDate && toLocalDateKey(new Date(l.scheduledDate)) === key
      ).length,
    };
  });

export const InstructorDashboard = ({ navigation }: any) => {
  const { user, logout } = useAuth();
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
      setData({
        today,
        week,
        pendingLessons,
        exams,
        pendingEnrollments: enrollments.length,
      });
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to load your day'));
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
    // No need to navigate - AuthContext will trigger navigator rebuild
  };

  /** Écran cloisonné à l'école de l'instructeur : `schoolId` vient de A3 (D-19). */
  const openEnrollmentRequests = () => {
    if (!schoolId) {
      Alert.alert('No school', 'Your account is not linked to a school yet.');
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
      Alert.alert('Error', getApiErrorMessage(err, 'Failed to record attendance'));
    } finally {
      setProcessing(false);
    }
  };

  const renderHeader = () => {
    const now = new Date();
    return (
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.greeting}>
            {now.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
          </Text>
          <Text style={styles.title}>Today</Text>
          <Text style={styles.subtitle}>Hi, {user?.firstName || 'Instructor'}</Text>
        </View>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
          <Ionicons name="log-out-outline" size={24} color={colors.text.secondary} />
        </TouchableOpacity>
      </View>
    );
  };

  const renderRequests = (home: TodayData) => {
    const lessons = home.pendingLessons.length;
    const codes = home.pendingLessons.filter((l) => l.type === LessonType.CODE).length;
    const exams = home.exams.filter((e) => e.status === ExamStatus.PENDING).length;
    const enrollments = home.pendingEnrollments;
    if (lessons + exams + enrollments === 0) {
      return (
        <View style={styles.quietRow}>
          <Ionicons name="checkmark-done-outline" size={18} color={colors.success[600]} />
          <Text style={styles.quietText}>No pending requests — enjoy your day</Text>
        </View>
      );
    }
    const rows = [
      lessons > 0 && {
        key: 'lessons',
        icon: 'time-outline',
        text: `${lessons} lesson request${lessons === 1 ? '' : 's'} waiting`,
        hint: codes >= 2 ? `${codes} code requests can be scheduled together` : null,
        onPress: () => navigation.navigate('LessonRequests'),
      },
      exams > 0 && {
        key: 'exams',
        icon: 'ribbon-outline',
        text: `${exams} exam request${exams === 1 ? '' : 's'} waiting`,
        hint: null,
        onPress: () => navigation.navigate('ExamRequests'),
      },
      enrollments > 0 && {
        key: 'enrollments',
        icon: 'people-outline',
        text: `${enrollments} enrollment request${enrollments === 1 ? '' : 's'} waiting`,
        hint: null,
        onPress: openEnrollmentRequests,
      },
    ].filter(Boolean) as {
      key: string;
      icon: string;
      text: string;
      hint: string | null;
      onPress: () => void;
    }[];
    return (
      <View style={styles.requestsCard}>
        {rows.map((row) => (
          <TouchableOpacity
            key={row.key}
            style={styles.requestRow}
            onPress={row.onPress}
            activeOpacity={0.7}
          >
            <Ionicons name={row.icon as any} size={20} color={colors.warning[600]} />
            <View style={styles.requestBody}>
              <Text style={styles.requestText}>{row.text}</Text>
              {row.hint ? <Text style={styles.requestHint}>{row.hint}</Text> : null}
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.warning[600]} />
          </TouchableOpacity>
        ))}
      </View>
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
    const dotColor = isDone
      ? lesson.attended === false
        ? colors.error[500]
        : colors.success[500]
      : isCurrent
        ? colors.primary[600]
        : colors.neutral[300];
    return (
      <View key={lesson.id} style={styles.timelineRow}>
        <View style={styles.timeColumn}>
          <Text style={[styles.timeText, isCurrent && styles.timeTextCurrent]} numberOfLines={1}>
            {formatTime(lesson.scheduledDate)}
          </Text>
        </View>
        <View style={styles.rail}>
          <View style={[styles.dot, { backgroundColor: dotColor }]} />
          {!isLast ? <View style={styles.railLine} /> : null}
        </View>
        <View style={[styles.lessonCard, isCurrent && styles.lessonCardCurrent]}>
          <View style={styles.lessonTop}>
            <Text style={styles.studentName}>{formatPersonName(lesson.student, 'Student')}</Text>
            {isDone ? (
              <View
                style={[
                  styles.chip,
                  lesson.attended === false ? styles.chipAbsent : styles.chipDone,
                ]}
              >
                <Text
                  style={[
                    styles.chipText,
                    lesson.attended === false ? styles.chipTextAbsent : styles.chipTextDone,
                  ]}
                >
                  {lesson.attended === false ? 'Absent' : 'Done'}
                </Text>
              </View>
            ) : isCurrent ? (
              <View style={[styles.chip, styles.chipNow]}>
                <Text style={[styles.chipText, styles.chipTextNow]}>Now</Text>
              </View>
            ) : isOverdue ? (
              <View style={[styles.chip, styles.chipOverdue]}>
                <Text style={[styles.chipText, styles.chipTextOverdue]}>To record</Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.lessonMeta}>
            {lessonTypeLabel(lesson.type) ?? lesson.type}
            {lesson.durationMinutes ? ` · ${lesson.durationMinutes} min` : ''}
          </Text>
          {canRecord ? (
            <View style={styles.attendanceRow}>
              <TouchableOpacity
                style={[styles.attendanceButton, styles.presentButton]}
                onPress={() => openAttendance(lesson, true)}
                activeOpacity={0.7}
              >
                <Ionicons name="checkmark-circle" size={18} color={colors.text.inverse} />
                <Text style={styles.presentText}>Present</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.attendanceButton, styles.absentButton]}
                onPress={() => openAttendance(lesson, false)}
                activeOpacity={0.7}
              >
                <Ionicons name="close-circle" size={18} color={colors.error[600]} />
                <Text style={styles.absentText}>Absent</Text>
              </TouchableOpacity>
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
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Your lessons</Text>
          <TouchableOpacity onPress={() => navigation.navigate('TodayLessons')}>
            <Text style={styles.cardLink}>Full list</Text>
          </TouchableOpacity>
        </View>
        {lessons.length === 0 ? (
          <View style={styles.emptyBlock}>
            <Text style={styles.emptyText}>No lessons today.</Text>
            <TouchableOpacity onPress={() => navigation.navigate('BookForStudent')}>
              <Text style={styles.cardLink}>Book a lesson for a student</Text>
            </TouchableOpacity>
          </View>
        ) : (
          lessons.map((lesson, index) =>
            renderLesson(lesson, current, index === lessons.length - 1)
          )
        )}
      </View>
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
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Exams today</Text>
          <TouchableOpacity onPress={() => navigation.navigate('TodayExams')}>
            <Text style={styles.cardLink}>Record results</Text>
          </TouchableOpacity>
        </View>
        {exams.map((exam) => (
          <TouchableOpacity
            key={exam.id}
            style={styles.examRow}
            onPress={() => navigation.navigate('TodayExams')}
            activeOpacity={0.7}
          >
            <Text style={styles.timeText} numberOfLines={1}>
              {formatTime(exam.dateTime)}
            </Text>
            <View style={styles.examBody}>
              <Text style={styles.studentName}>
                {formatPersonName(
                  { firstName: exam.studentFirstName, lastName: exam.studentLastName },
                  'Student'
                )}
              </Text>
              <Text style={styles.lessonMeta}>
                {examTypeLabel(exam.type)} exam{exam.location ? ` · ${exam.location}` : ''}
              </Text>
            </View>
            <View style={[styles.chip, styles.chipNow]}>
              <Text style={[styles.chipText, styles.chipTextNow]}>Result</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const renderWeek = (home: TodayData) => {
    const days = weekLoad(home.week);
    const max = Math.max(1, ...days.map((d) => d.count));
    const total = days.reduce((sum, d) => sum + d.count, 0);
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Next 7 days</Text>
          <Text style={styles.cardMeta}>
            {total} lesson{total === 1 ? '' : 's'}
          </Text>
        </View>
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
      </View>
    );
  };

  const renderLinks = () => (
    <View style={styles.linksRow}>
      {[
        { label: 'Book for a student', icon: 'add-circle-outline', route: 'BookForStudent' },
        { label: 'Enrollments', icon: 'people-outline', route: 'EnrollmentRequests' },
        { label: "Today's exams", icon: 'ribbon-outline', route: 'TodayExams' },
        { label: 'Exam requests', icon: 'clipboard-outline', route: 'ExamRequests' },
      ].map((link) => (
        <TouchableOpacity
          key={link.route}
          style={styles.linkChip}
          onPress={() =>
            link.route === 'EnrollmentRequests'
              ? openEnrollmentRequests()
              : navigation.navigate(link.route)
          }
        >
          <Ionicons name={link.icon as any} size={16} color={colors.text.secondary} />
          <Text style={styles.linkText}>{link.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderBody = () => {
    if (loading && !data) {
      return (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary[600]} />
        </View>
      );
    }
    if (!data) {
      return (
        <View style={styles.card}>
          <Text style={styles.emptyText}>{error ?? 'Nothing to show yet.'}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={load}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
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

      {/* Présence depuis la carte (L7) */}
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
    fontSize: typography.size.sm,
    color: colors.text.secondary,
  },
  title: {
    fontSize: typography.size['3xl'],
    fontWeight: typography.weight.bold,
    color: colors.text.primary,
  },
  subtitle: {
    fontSize: typography.size.sm,
    color: colors.text.tertiary,
    marginTop: spacing.xs,
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
  retryButton: {
    marginTop: spacing.md,
    alignSelf: 'flex-start',
    backgroundColor: colors.primary[600],
    borderRadius: 10,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  retryText: {
    color: colors.text.inverse,
    fontWeight: typography.weight.semibold,
  },

  // Demandes
  quietRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  quietText: {
    fontSize: typography.size.sm,
    color: colors.text.secondary,
  },
  requestsCard: {
    backgroundColor: colors.warning[50],
    borderRadius: 16,
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  requestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  requestBody: {
    flex: 1,
  },
  requestText: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
  },
  requestHint: {
    fontSize: typography.size.xs,
    color: colors.warning[600],
    marginTop: 2,
  },

  // Cartes
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
  cardMeta: {
    fontSize: typography.size.sm,
    color: colors.text.secondary,
  },
  emptyBlock: {
    gap: spacing.sm,
  },
  emptyText: {
    fontSize: typography.size.sm,
    color: colors.text.secondary,
  },

  // Timeline
  timelineRow: {
    flexDirection: 'row',
  },
  timeColumn: {
    // « 10:00 AM » doit tenir sur une ligne
    width: 68,
    paddingTop: spacing.md,
  },
  timeText: {
    fontSize: typography.size.sm,
    fontWeight: typography.weight.semibold,
    color: colors.text.secondary,
  },
  timeTextCurrent: {
    color: colors.primary[700],
  },
  rail: {
    width: 20,
    alignItems: 'center',
    paddingTop: spacing.md + 4,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  railLine: {
    flex: 1,
    width: 2,
    backgroundColor: colors.border.default,
    marginTop: spacing.xs,
  },
  lessonCard: {
    flex: 1,
    marginLeft: spacing.sm,
    marginBottom: spacing.md,
    padding: spacing.md,
    borderRadius: 14,
    backgroundColor: colors.background.secondary,
  },
  lessonCardCurrent: {
    backgroundColor: colors.primary[50],
    borderWidth: 1,
    borderColor: colors.primary[200],
  },
  lessonTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  studentName: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
    flexShrink: 1,
  },
  lessonMeta: {
    fontSize: typography.size.sm,
    color: colors.text.secondary,
    marginTop: 2,
  },
  chip: {
    borderRadius: 999,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 2,
  },
  chipText: {
    fontSize: typography.size.xs,
    fontWeight: typography.weight.semibold,
  },
  chipDone: {
    backgroundColor: colors.success[50],
  },
  chipTextDone: {
    color: colors.success[600],
  },
  chipAbsent: {
    backgroundColor: colors.error[50],
  },
  chipTextAbsent: {
    color: colors.error[600],
  },
  chipNow: {
    backgroundColor: colors.primary[600],
  },
  chipOverdue: {
    backgroundColor: colors.warning[50],
  },
  chipTextOverdue: {
    color: colors.warning[600],
  },
  chipTextNow: {
    color: colors.text.inverse,
  },
  attendanceRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  attendanceButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    borderRadius: 10,
    paddingVertical: spacing.sm + 2,
  },
  presentButton: {
    backgroundColor: colors.success[600],
  },
  presentText: {
    color: colors.text.inverse,
    fontWeight: typography.weight.semibold,
  },
  absentButton: {
    backgroundColor: colors.background.primary,
    borderWidth: 1,
    borderColor: colors.error[500],
  },
  absentText: {
    color: colors.error[600],
    fontWeight: typography.weight.semibold,
  },

  // Examens
  examRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  examBody: {
    flex: 1,
  },

  // Semaine
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    height: 110,
  },
  weekDay: {
    flex: 1,
    alignItems: 'center',
  },
  weekCount: {
    fontSize: typography.size.xs,
    color: colors.text.secondary,
    height: 16,
  },
  barTrack: {
    flex: 1,
    width: 14,
    justifyContent: 'flex-end',
    marginVertical: spacing.xs,
  },
  bar: {
    width: '100%',
    borderRadius: 7,
    backgroundColor: colors.primary[200],
  },
  barToday: {
    backgroundColor: colors.primary[600],
  },
  weekLabel: {
    fontSize: typography.size.xs,
    color: colors.text.tertiary,
  },
  weekLabelToday: {
    color: colors.primary[700],
    fontWeight: typography.weight.semibold,
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
