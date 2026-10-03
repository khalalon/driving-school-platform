/**
 * Agenda de l'école (15.3, D-59) — L9 `GET /api/lessons/agenda`.
 *
 * Une semaine à la fois (lundi → dimanche), avec semaine précédente / suivante et retour à
 * aujourd'hui. Tout instructeur voit l'agenda de **toute son école** ; des pastilles filtrent
 * par instructeur. Chaque leçon (planifiée ou faite) affiche l'heure, la durée, le type,
 * l'élève, et l'instructeur quand toute l'école est affichée ; la toucher ouvre la fiche élève.
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../context/AuthContext';
import { useI18n } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
import { AppBar, Badge, Chip, SkeletonCard } from '../../components/ui';
import { lessonService } from '../../services/api/LessonService';
import { schoolService } from '../../services/api/SchoolService';
import { getApiErrorMessage } from '../../services/api/ApiError';
import { lessonTypeLabel, Lesson, LessonStatus } from '../../models/Lesson';
import { SchoolInstructor } from '../../models/School';
import { AgendaDay, addDays, groupByDay, lessonEnd, startOfWeek, weekRange } from '../../utils/agenda';
import { dateLocale, formatPersonName, formatTime, toLocalDateKey } from '../../utils/format';
import { mirrorIcon } from '../../utils/rtl';
import { MIN_TOUCH_TARGET } from '../../theme/tokens';
import { Theme, textStyle } from '../../theme';
import type { Language } from '../../i18n';

export const AgendaScreen = ({ navigation }: any) => {
  const { t, language } = useI18n();
  const { user } = useAuth();
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme, language), [theme, language]);
  const schoolId = user?.schoolId ?? null;

  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [instructorId, setInstructorId] = useState<string | null>(null);
  const [instructors, setInstructors] = useState<SchoolInstructor[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const { from, to } = weekRange(weekStart);
    try {
      const data = await lessonService.getAgenda(from, to, instructorId ?? undefined);
      setLessons(data);
    } catch (error) {
      Alert.alert(t('common.error'), getApiErrorMessage(error, t('agenda.loadFailed')));
    } finally {
      setLoading(false);
    }
  }, [weekStart, instructorId, t]);

  // Rechargé à chaque retour sur l'onglet, et à chaque changement de semaine ou de filtre
  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load();
    }, [load])
  );

  // Les instructeurs de l'école, pour le filtre (S3) ; un échec laisse « Toute l'école » seul
  useFocusEffect(
    useCallback(() => {
      if (!schoolId) return;
      schoolService
        .getSchoolInstructors(schoolId)
        .then(setInstructors)
        .catch(() => setInstructors([]));
    }, [schoolId])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const days = useMemo(() => groupByDay(lessons, weekStart), [lessons, weekStart]);
  const todayKey = toLocalDateKey();
  const weekEnd = addDays(weekStart, 6);
  const weekLabel = t('agenda.week', {
    from: weekStart.toLocaleDateString(dateLocale(), { day: 'numeric', month: 'short' }),
    to: weekEnd.toLocaleDateString(dateLocale(), { day: 'numeric', month: 'short' }),
  });
  const isCurrentWeek = startOfWeek(new Date()).getTime() === weekStart.getTime();

  const openStudent = (lesson: Lesson) => {
    if (!schoolId) return;
    navigation.navigate('StudentProfile', {
      studentId: lesson.studentId,
      schoolId,
      studentName: formatPersonName(lesson.student, t('today.student')),
    });
  };

  const renderLesson = (lesson: Lesson) => {
    const done = lesson.status === LessonStatus.COMPLETED;
    const absent = done && lesson.attended === false;
    const student = formatPersonName(lesson.student, t('today.student'));
    const time = `${formatTime(lesson.scheduledDate)} – ${formatTime(lessonEnd(lesson))}`;
    const type = lessonTypeLabel(lesson.type) ?? lesson.type;
    return (
      <Pressable
        key={lesson.id}
        onPress={() => openStudent(lesson)}
        accessibilityRole="button"
        accessibilityLabel={t('agenda.lessonA11y', { time, type, student })}
        accessibilityHint={t('agenda.openStudent')}
        style={({ pressed }) => [styles.lesson, pressed && styles.pressed]}
        testID={`agenda-lesson-${lesson.id}`}
      >
        <View style={styles.timeColumn}>
          <Text style={styles.time}>{formatTime(lesson.scheduledDate)}</Text>
          <Text style={styles.duration}>
            {t('format.minutes', { count: lesson.durationMinutes ?? 60 })}
          </Text>
        </View>
        <View style={styles.lessonBody}>
          <Text style={styles.student} numberOfLines={1}>
            {student}
          </Text>
          <Text style={styles.meta} numberOfLines={1}>
            {instructorId || !lesson.instructor
              ? type
              : `${type} · ${formatPersonName(lesson.instructor, t('today.instructor'))}`}
          </Text>
        </View>
        {done ? (
          <Badge
            label={absent ? t('today.absent') : t('today.done')}
            tone={absent ? 'danger' : 'success'}
          />
        ) : (
          <Ionicons
            name={mirrorIcon('chevron-forward')}
            size={18}
            color={theme.colors.textMuted}
          />
        )}
      </Pressable>
    );
  };

  const renderDay = (day: AgendaDay) => {
    const today = day.key === todayKey;
    return (
      <View key={day.key} style={styles.day} testID={`agenda-day-${day.key}`}>
        <View style={styles.dayHeader}>
          <Text style={[styles.dayTitle, today && styles.dayTitleToday]} accessibilityRole="header">
            {day.date.toLocaleDateString(dateLocale(), {
              weekday: 'long',
              day: 'numeric',
              month: 'short',
            })}
          </Text>
          {today ? <Badge label={t('agenda.today')} tone="telemetry" /> : null}
        </View>
        {day.lessons.length === 0 ? (
          <Text style={styles.empty}>{t('agenda.noLesson')}</Text>
        ) : (
          day.lessons.map(renderLesson)
        )}
      </View>
    );
  };

  const weekButton = (icon: 'chevron-back' | 'chevron-forward', label: string, delta: number) => (
    <Pressable
      onPress={() => setWeekStart((start) => addDays(start, delta))}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={6}
      style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
      testID={delta < 0 ? 'agenda-previous-week' : 'agenda-next-week'}
    >
      <Ionicons name={mirrorIcon(icon)} size={22} color={theme.colors.textPrimary} />
    </Pressable>
  );

  return (
    <View style={styles.flex}>
      <AppBar title={t('agenda.title')} large />

      <View style={styles.weekBar}>
        {weekButton('chevron-back', t('agenda.previousWeek'), -7)}
        <Text style={styles.weekLabel} accessibilityLiveRegion="polite" testID="agenda-week-label">
          {weekLabel}
        </Text>
        {weekButton('chevron-forward', t('agenda.nextWeek'), 7)}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filters}
        style={styles.filtersRow}
      >
        <Chip
          label={t('agenda.myAvailability')}
          icon="time-outline"
          onPress={() => navigation.navigate('MyAvailability')}
          testID="agenda-my-availability"
        />
        {isCurrentWeek ? null : (
          <Chip
            label={t('agenda.backToToday')}
            icon="today-outline"
            onPress={() => setWeekStart(startOfWeek(new Date()))}
            testID="agenda-today"
          />
        )}
        <Chip
          label={t('agenda.allInstructors')}
          selected={instructorId === null}
          onPress={() => setInstructorId(null)}
          testID="agenda-filter-all"
        />
        {instructors.map((instructor) => (
          <Chip
            key={instructor.id}
            label={formatPersonName(instructor, t('today.instructor'))}
            selected={instructorId === instructor.id}
            onPress={() => setInstructorId(instructor.id)}
            testID={`agenda-filter-${instructor.id}`}
          />
        ))}
      </ScrollView>

      {loading && lessons.length === 0 ? (
        <View style={styles.skeletons}>
          <SkeletonCard lines={3} />
          <SkeletonCard lines={3} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={theme.colors.signal}
            />
          }
        >
          {lessons.length === 0 ? (
            <Text style={styles.weekEmpty}>{t('agenda.emptyWeek')}</Text>
          ) : null}
          {days.map(renderDay)}
        </ScrollView>
      )}
    </View>
  );
};

const createStyles = (theme: Theme, language: Language) =>
  StyleSheet.create({
    flex: { flex: 1, backgroundColor: theme.colors.surface },
    weekBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: theme.spacing.base,
      paddingVertical: theme.spacing.sm,
    },
    weekLabel: {
      ...textStyle('heading', language),
      color: theme.colors.textPrimary,
      textAlign: 'center',
      flex: 1,
    },
    iconButton: {
      width: MIN_TOUCH_TARGET,
      height: MIN_TOUCH_TARGET,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: theme.radius.md,
      backgroundColor: theme.colors.surfaceRaised,
    },
    filtersRow: { flexGrow: 0 },
    filters: {
      paddingHorizontal: theme.spacing.base,
      paddingBottom: theme.spacing.sm,
      gap: theme.spacing.sm,
    },
    skeletons: { padding: theme.spacing.base, gap: theme.spacing.md },
    content: { padding: theme.spacing.base, gap: theme.spacing.base },
    weekEmpty: { ...textStyle('body', language), color: theme.colors.textSecondary },
    day: { gap: theme.spacing.sm },
    dayHeader: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
    dayTitle: { ...textStyle('label', language), color: theme.colors.textSecondary },
    dayTitleToday: { color: theme.colors.telemetryText },
    empty: { ...textStyle('caption', language), color: theme.colors.textMuted },
    lesson: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.md,
      minHeight: MIN_TOUCH_TARGET + 12,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      borderRadius: theme.radius.md,
      backgroundColor: theme.colors.surfaceRaised,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    pressed: { opacity: 0.7 },
    timeColumn: { minWidth: 56 },
    time: { ...textStyle('numeric', language), color: theme.colors.signalText },
    duration: { ...textStyle('caption', language), color: theme.colors.textMuted },
    lessonBody: { flex: 1, gap: 2 },
    student: { ...textStyle('bodyStrong', language), color: theme.colors.textPrimary },
    meta: { ...textStyle('caption', language), color: theme.colors.textSecondary },
  });
