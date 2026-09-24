/**
 * Mes leçons (11.3) — L1, annulation L3.
 *
 * Une leçon naît d'une demande (`pending`, date souhaitée), est planifiée par l'instructeur
 * (`scheduled`, date confirmée), puis passe `completed` ; l'élève voit l'état de paiement (D-32)
 * et son avoir (D-40). Le filtre est une rangée de `Chip`, le statut un `Badge` d'intention.
 */

import React, { useState, useCallback, useMemo } from 'react';
import { Alert, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { lessonService } from '../../services/api/LessonService';
import { getApiErrorCode, getApiErrorMessage } from '../../services/api/ApiError';
import {
  LESSON_CANCEL_HOURS,
  lessonStatusLabel,
  lessonTypeLabel,
  Lesson,
  LessonStatus,
  canStudentCancel,
  paymentNote,
} from '../../models/Lesson';
import { useSchoolCurrency } from '../../hooks/useSchoolCurrency';
import { useI18n } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
import {
  AppBar,
  Badge,
  Button,
  Card,
  Chip,
  EmptyState,
  SkeletonCard,
  Tone,
} from '../../components/ui';
import { TranslationKey } from '../../i18n';
import { dateLocale, formatAmount, formatPersonName, formatTime } from '../../utils/format';
import { Theme } from '../../theme';

type FilterType = 'pending' | 'upcoming' | 'completed' | 'closed';

const FILTERS: { key: FilterType; labelKey: TranslationKey; statuses: LessonStatus[] }[] = [
  { key: 'pending', labelKey: 'filter.pending', statuses: [LessonStatus.PENDING] },
  { key: 'upcoming', labelKey: 'filter.upcoming', statuses: [LessonStatus.SCHEDULED] },
  { key: 'completed', labelKey: 'filter.completed', statuses: [LessonStatus.COMPLETED] },
  {
    key: 'closed',
    labelKey: 'filter.closed',
    statuses: [LessonStatus.CANCELLED, LessonStatus.REJECTED],
  },
];

/** Statut → intention de couleur : le thème décide du rendu. */
const statusTone = (status: LessonStatus): Tone => {
  switch (status) {
    case LessonStatus.PENDING:
      return 'warning';
    case LessonStatus.SCHEDULED:
      return 'accent';
    case LessonStatus.COMPLETED:
      return 'success';
    case LessonStatus.CANCELLED:
    case LessonStatus.REJECTED:
      return 'danger';
  }
};

/** Date affichée : celle confirmée par l'instructeur, sinon celle souhaitée par l'élève. */
const lessonDateOf = (lesson: Lesson): Date | null => {
  const iso = lesson.scheduledDate ?? lesson.requestedDate;
  return iso ? new Date(iso) : null;
};

export const MyLessonsScreen = ({ navigation }: any) => {
  const { t } = useI18n();
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [filter, setFilter] = useState<FilterType>('upcoming');
  // Une seule inscription active (D-22) : toutes les leçons sont dans la même école
  const currency = useSchoolCurrency(lessons[0]?.schoolId);

  // Onglet (8.4) : rechargé à chaque retour au premier plan
  useFocusEffect(
    useCallback(() => {
      loadLessons();
    }, [])
  );

  const loadLessons = async () => {
    try {
      setLoading(true);
      const data = await lessonService.getMyLessons();
      setLessons(data);
    } catch (error) {
      Alert.alert(t('common.error'), getApiErrorMessage(error, t('myLessons.loadFailed')));
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadLessons();
    setRefreshing(false);
  }, []);

  const handleCancelLesson = (lesson: Lesson) => {
    const isRequest = lesson.status === LessonStatus.PENDING;
    Alert.alert(
      isRequest ? t('myLessons.withdrawTitle') : t('myLessons.cancelTitle'),
      isRequest ? t('myLessons.withdrawConfirm') : t('myLessons.cancelConfirm'),
      [
        { text: t('home.cancelNo'), style: 'cancel' },
        {
          text: t('home.cancelYes'),
          style: 'destructive',
          onPress: () => confirmCancelLesson(lesson.id),
        },
      ]
    );
  };

  const confirmCancelLesson = async (lessonId: string) => {
    try {
      await lessonService.cancelLesson(lessonId);
      Alert.alert(t('common.success'), t('myLessons.cancelled'));
      loadLessons();
    } catch (error) {
      // Fenêtre de 24 h (D-24) contrôlée par le serveur : le bouton n'est qu'un confort
      if (getApiErrorCode(error) === 'CANCEL_WINDOW_CLOSED') {
        Alert.alert(
          t('home.tooLateTitle'),
          getApiErrorMessage(error, t('home.tooLateText', { hours: LESSON_CANCEL_HOURS }))
        );
        loadLessons();
        return;
      }
      Alert.alert(t('common.error'), getApiErrorMessage(error, t('home.cancelFailed')));
    }
  };

  const activeFilter = FILTERS.find((f) => f.key === filter) ?? FILTERS[0];
  const filteredLessons = lessons.filter((lesson) => activeFilter.statuses.includes(lesson.status));

  const renderLessonCard = ({ item }: { item: Lesson }) => {
    const lessonDate = lessonDateOf(item);
    const isPending = item.status === LessonStatus.PENDING;
    // D-24 : demande pending toujours ; leçon planifiée jusqu'à 24 h avant (masquage de confort)
    const canCancel = canStudentCancel(item);
    // Leçon planifiée déjà passée : elle attend que l'instructeur pointe la présence (L7)
    const isAwaitingAttendance =
      item.status === LessonStatus.SCHEDULED &&
      !!item.scheduledDate &&
      new Date(item.scheduledDate).getTime() + (item.durationMinutes ?? 60) * 60000 <= Date.now();
    const note = paymentNote(item);

    return (
      <Card style={styles.card}>
        <View style={styles.head}>
          <View style={styles.dateBox}>
            <Text style={styles.dateMonth}>
              {lessonDate ? lessonDate.toLocaleDateString(dateLocale(), { month: 'short' }) : '—'}
            </Text>
            <Text style={styles.dateDay}>{lessonDate ? lessonDate.getDate() : '?'}</Text>
          </View>

          <View style={styles.info}>
            <Text style={styles.type}>{lessonTypeLabel(item.type) ?? item.type}</Text>
            <View style={styles.metaRow}>
              <Ionicons name="person-outline" size={15} color={theme.colors.textMuted} />
              <Text style={styles.meta} numberOfLines={1}>
                {item.instructor
                  ? formatPersonName(item.instructor, t('myLessons.instructorFallback'))
                  : isPending
                    ? t('myLessons.awaitingInstructor')
                    : t('myLessons.noInstructor')}
              </Text>
            </View>
            <View style={styles.metaRow}>
              <Ionicons name="time-outline" size={15} color={theme.colors.textMuted} />
              <Text style={styles.meta}>
                {isPending ? t('myLessons.requestedPrefix') : ''}
                {formatTime(item.scheduledDate ?? item.requestedDate)}
                {item.durationMinutes
                  ? ` · ${t('format.minutes', { count: item.durationMinutes })}`
                  : ''}
              </Text>
            </View>
          </View>

          <Badge label={lessonStatusLabel(item.status)} tone={statusTone(item.status)} />
        </View>

        {/* Prix et état de paiement (D-32), avoir (D-40) */}
        {item.price !== null || item.paid ? (
          <View style={styles.priceRow}>
            <Ionicons name="cash-outline" size={16} color={theme.colors.textSecondary} />
            <Text style={styles.price}>{formatAmount(item.price, currency)}</Text>
            <Badge
              label={item.paid ? t('myLessons.paid') : t('myLessons.unpaid')}
              tone={item.paid ? 'success' : 'neutral'}
            />
          </View>
        ) : null}

        {note === 'paid-with-credit' ? (
          <Text style={styles.note}>{t('myLessons.paidWithCredit')}</Text>
        ) : null}
        {note === 'credit-applied' ? (
          <Text style={styles.note}>
            {t('myLessons.creditAppliedNote', {
              credit: formatAmount(item.creditApplied, currency),
              remaining: formatAmount(item.amount, currency),
            })}
          </Text>
        ) : null}
        {note === 'refunded-as-credit' ? (
          <Text style={styles.note}>{t('myLessons.refundedAsCredit')}</Text>
        ) : null}

        {item.status === LessonStatus.COMPLETED && item.attended === false ? (
          <View style={styles.reason}>
            <Ionicons name="alert-circle" size={18} color={theme.colors.dangerText} />
            <Text style={styles.reasonText}>{t('myLessons.absentNotBilled')}</Text>
          </View>
        ) : null}

        {item.status === LessonStatus.REJECTED && item.rejectionReason ? (
          <View style={styles.reason}>
            <Ionicons name="information-circle" size={18} color={theme.colors.dangerText} />
            <Text style={styles.reasonText}>{item.rejectionReason}</Text>
          </View>
        ) : null}

        {item.status === LessonStatus.CANCELLED && item.cancellationReason ? (
          <View style={styles.reason}>
            <Ionicons name="information-circle" size={18} color={theme.colors.dangerText} />
            <Text style={styles.reasonText}>{item.cancellationReason}</Text>
          </View>
        ) : null}

        {canCancel ? (
          <Button
            title={isPending ? t('myLessons.withdrawAction') : t('myLessons.cancelAction')}
            onPress={() => handleCancelLesson(item)}
            variant="ghost"
            size="sm"
            icon="close-circle-outline"
          />
        ) : item.status === LessonStatus.SCHEDULED ? (
          <Text style={styles.hint}>
            {isAwaitingAttendance
              ? t('myLessons.awaitingAttendance')
              : t('myLessons.cancelClosed', { hours: LESSON_CANCEL_HOURS })}
          </Text>
        ) : null}
      </Card>
    );
  };

  return (
    <View style={styles.flex}>
      <AppBar title={t('myLessons.title')} large />

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
              title={t('myLessons.emptyTitle', { filter: t(activeFilter.labelKey) })}
              message={
                filter === 'upcoming' || filter === 'pending'
                  ? t('myLessons.emptyRequest')
                  : t('myLessons.emptyOther')
              }
              action={
                filter === 'upcoming' || filter === 'pending'
                  ? {
                      label: t('myLessons.requestLesson'),
                      onPress: () => navigation.navigate('SchoolsList'),
                    }
                  : undefined
              }
            />
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[theme.colors.accent]}
              tintColor={theme.colors.accent}
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
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
      flexWrap: 'wrap',
    },
    skeletons: { padding: theme.spacing.base, gap: theme.spacing.md },
    listContent: { padding: theme.spacing.base, paddingTop: 0, gap: theme.spacing.md },
    emptyList: { flexGrow: 1, justifyContent: 'center' },
    card: { gap: theme.spacing.md },
    head: { flexDirection: 'row', alignItems: 'flex-start', gap: theme.spacing.md },
    dateBox: {
      width: 52,
      paddingVertical: theme.spacing.sm,
      borderRadius: theme.radius.md,
      backgroundColor: theme.colors.accentSoft,
      alignItems: 'center',
    },
    dateMonth: {
      fontSize: theme.typography.size.xs,
      fontWeight: theme.typography.weight.semibold,
      color: theme.colors.accentText,
      textTransform: 'uppercase',
    },
    dateDay: {
      fontSize: theme.typography.size.xl,
      fontWeight: theme.typography.weight.bold,
      color: theme.colors.accentText,
    },
    info: { flex: 1, gap: 2 },
    type: {
      fontSize: theme.typography.size.base,
      fontWeight: theme.typography.weight.semibold,
      color: theme.colors.textPrimary,
    },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs },
    meta: { flex: 1, fontSize: theme.typography.size.sm, color: theme.colors.textSecondary },
    priceRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
    price: {
      flex: 1,
      fontSize: theme.typography.size.base,
      fontWeight: theme.typography.weight.medium,
      color: theme.colors.textPrimary,
    },
    note: { fontSize: theme.typography.size.sm, color: theme.colors.successText },
    reason: {
      flexDirection: 'row',
      gap: theme.spacing.sm,
      backgroundColor: theme.colors.dangerSoft,
      borderRadius: theme.radius.md,
      padding: theme.spacing.md,
    },
    reasonText: { flex: 1, fontSize: theme.typography.size.sm, color: theme.colors.dangerText },
    hint: { fontSize: theme.typography.size.xs, color: theme.colors.textMuted },
  });
