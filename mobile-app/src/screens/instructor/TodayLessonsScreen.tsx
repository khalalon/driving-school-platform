/**
 * Leçons du jour de l'instructeur (11.4) — L1 `scope=mine, date`, présence L7.
 *
 * Un instructeur ne voit et ne pointe que ses leçons (D-32). La présence passe la leçon en
 * `completed` ; le compteur de leçons effectuées de l'élève n'augmente que s'il était présent
 * (D-33). Une leçon = un élève (D-34) : la présence se fait par identifiant de leçon.
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Alert, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { lessonService } from '../../services/api/LessonService';
import { getApiErrorMessage } from '../../services/api/ApiError';
import { useI18n } from '../../context/LanguageContext';
import { useToast } from '../../context/ToastContext';
import { useTheme } from '../../context/ThemeContext';
import { AppBar, Badge, Button, Card, Chip, EmptyState, SkeletonCard } from '../../components/ui';
import { lessonTypeLabel, Lesson, LessonStatus, MarkAttendanceData } from '../../models/Lesson';
import { TranslationKey } from '../../i18n';
import { formatPersonName, formatTime, toLocalDateKey } from '../../utils/format';
import { Theme } from '../../theme';
import { AttendanceModal } from './components/AttendanceModal';

type FilterType = 'upcoming' | 'completed';

const FILTERS: { key: FilterType; labelKey: TranslationKey }[] = [
  { key: 'upcoming', labelKey: 'filter.upcoming' },
  { key: 'completed', labelKey: 'filter.completed' },
];

export const TodayLessonsScreen = ({ navigation }: any) => {
  const { t } = useI18n();
  const { showToast } = useToast();
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [filter, setFilter] = useState<FilterType>('upcoming');
  const [processing, setProcessing] = useState(false);

  // Présence (L7) : la leçon sélectionnée ouvre la modale partagée
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);

  useEffect(() => {
    loadTodayLessons();
  }, []);

  const loadTodayLessons = async () => {
    try {
      setLoading(true);
      // L1 : mes leçons du jour (planifiées, et déjà pointées pour l'onglet « Terminées »)
      const data = await lessonService.getMyLessons({
        status: [LessonStatus.SCHEDULED, LessonStatus.COMPLETED],
        scope: 'mine',
        date: toLocalDateKey(),
      });
      setLessons(data);
    } catch (error) {
      Alert.alert(t('common.error'), getApiErrorMessage(error, t('myLessons.loadFailed')));
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadTodayLessons();
    setRefreshing(false);
  }, []);

  const closeAttendance = () => setSelectedLesson(null);

  const confirmAttendance = async (data: MarkAttendanceData) => {
    if (!selectedLesson) return;
    try {
      setProcessing(true);
      // L7 : par identifiant de leçon, uniquement par son instructeur
      await lessonService.markAttendance(selectedLesson.id, data);
      showToast(data.attended ? t('attendance.recorded') : t('attendance.absenceRecorded'));
      closeAttendance();
      loadTodayLessons();
    } catch (error) {
      Alert.alert(t('common.error'), getApiErrorMessage(error, t('today.attendanceFailed')));
    } finally {
      setProcessing(false);
    }
  };

  const filteredLessons = lessons.filter((lesson) =>
    filter === 'upcoming'
      ? lesson.status === LessonStatus.SCHEDULED
      : lesson.status === LessonStatus.COMPLETED
  );

  const renderLessonCard = ({ item }: { item: Lesson }) => {
    const isCompleted = item.status === LessonStatus.COMPLETED;
    const absent = item.attended === false;

    return (
      <Card style={styles.card}>
        <View style={styles.head}>
          <View style={styles.timeBox}>
            <Ionicons name="time" size={18} color={theme.colors.signalText} />
            <Text style={styles.time}>{formatTime(item.scheduledDate)}</Text>
          </View>

          <View style={styles.info}>
            <Text style={styles.student}>{formatPersonName(item.student, t('today.student'))}</Text>
            <View style={styles.metaRow}>
              <Ionicons name="car-outline" size={15} color={theme.colors.textMuted} />
              <Text style={styles.meta}>{lessonTypeLabel(item.type) ?? item.type}</Text>
            </View>
            <View style={styles.metaRow}>
              <Ionicons name="hourglass-outline" size={15} color={theme.colors.textMuted} />
              <Text style={styles.meta}>
                {item.durationMinutes
                  ? t('format.minutes', { count: item.durationMinutes })
                  : t('format.empty')}
              </Text>
            </View>
            {item.adminNotes ? (
              <View style={styles.metaRow}>
                <Ionicons name="document-text-outline" size={15} color={theme.colors.textMuted} />
                <Text style={styles.meta}>{item.adminNotes}</Text>
              </View>
            ) : null}
          </View>

          {isCompleted ? (
            <Badge
              label={absent ? t('today.absent') : t('today.done')}
              tone={absent ? 'danger' : 'success'}
            />
          ) : null}
        </View>

        {isCompleted ? (
          <Text style={styles.attendance}>
            {absent ? t('attendance.studentAbsent') : t('attendance.studentPresent')}
            {item.rating ? ` · ${item.rating}/5` : ''}
            {item.feedback ? ` · ${item.feedback}` : ''}
          </Text>
        ) : (
          <Button
            title={t('attendance.record')}
            onPress={() => setSelectedLesson(item)}
            variant="secondary"
            size="sm"
            icon="checkmark-circle-outline"
            disabled={processing}
          />
        )}
      </Card>
    );
  };

  return (
    <View style={styles.flex}>
      <AppBar
        title={t('todayLessons.title')}
        onBack={() => navigation.goBack()}
        backLabel={t('common.back')}
      />

      <View style={styles.filters}>
        {FILTERS.map((tab) => (
          <Chip
            key={tab.key}
            label={t(tab.labelKey)}
            selected={filter === tab.key}
            onPress={() => setFilter(tab.key)}
          />
        ))}
      </View>

      {loading && lessons.length === 0 ? (
        <View style={styles.skeletons}>
          <SkeletonCard lines={3} />
          <SkeletonCard lines={3} />
        </View>
      ) : (
        <FlatList
          data={filteredLessons}
          renderItem={renderLessonCard}
          keyExtractor={(item) => item.id}
          contentContainerStyle={
            filteredLessons.length === 0 ? styles.emptyList : styles.listContent
          }
          ListEmptyComponent={
            <EmptyState
              icon="calendar-outline"
              title={t('todayLessons.emptyTitle', {
                filter: t(filter === 'upcoming' ? 'filter.upcoming' : 'filter.completed'),
              })}
              message={
                filter === 'upcoming'
                  ? t('todayLessons.emptyUpcoming')
                  : t('todayLessons.emptyCompleted')
              }
              tone="neutral"
            />
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[theme.colors.signal]}
              tintColor={theme.colors.signal}
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Présence (L7) */}
      <AttendanceModal
        lesson={selectedLesson}
        processing={processing}
        onClose={closeAttendance}
        onConfirm={confirmAttendance}
      />
    </View>
  );
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    flex: { flex: 1, backgroundColor: theme.colors.surface },
    filters: {
      flexDirection: 'row',
      gap: theme.spacing.sm,
      paddingHorizontal: theme.spacing.base,
      paddingVertical: theme.spacing.md,
    },
    skeletons: { padding: theme.spacing.base, gap: theme.spacing.md },
    listContent: { padding: theme.spacing.base, paddingTop: 0, gap: theme.spacing.md },
    emptyList: { flexGrow: 1, justifyContent: 'center' },
    card: { gap: theme.spacing.md },
    head: { flexDirection: 'row', alignItems: 'flex-start', gap: theme.spacing.md },
    timeBox: {
      alignItems: 'center',
      gap: theme.spacing.xs,
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.sm,
      borderRadius: theme.radius.md,
      backgroundColor: theme.colors.signalSoft,
      minWidth: 68,
    },
    time: {
      fontSize: theme.typography.size.sm,
      fontWeight: theme.typography.weight.semibold,
      color: theme.colors.signalText,
    },
    info: { flex: 1, gap: 2 },
    student: {
      fontSize: theme.typography.size.base,
      fontWeight: theme.typography.weight.semibold,
      color: theme.colors.textPrimary,
    },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs },
    meta: { flex: 1, fontSize: theme.typography.size.sm, color: theme.colors.textSecondary },
    attendance: { fontSize: theme.typography.size.sm, color: theme.colors.textSecondary },
  });
