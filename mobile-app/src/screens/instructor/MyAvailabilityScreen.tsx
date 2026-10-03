/**
 * Mes disponibilités (15.8, D-60) — I1 / I2 du contrat.
 *
 * L'instructeur tient sa **semaine type** : des plages par jour, du lundi au dimanche, en heure
 * de l'école. Les élèves choisissent un créneau libre dans ces plages ; chaque demande reste à
 * approuver par l'école (D-01). Les modifications restent locales jusqu'à « Enregistrer », qui
 * remplace toute la semaine d'un bloc — mêmes règles que le serveur, contrôlées avant l'envoi.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useI18n } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
import { useToast } from '../../context/ToastContext';
import { AppBar, Button, Card, Field, ListRow, SkeletonCard } from '../../components/ui';
import { availabilityService } from '../../services/api/AvailabilityService';
import { getApiErrorMessage } from '../../services/api/ApiError';
import {
  AvailabilityProblem,
  AvailabilitySlot,
  WEEK_ORDER,
  findAvailabilityProblem,
  sortSlots,
} from '../../models/Availability';
import { dateLocale } from '../../utils/format';
import { Theme, textStyle } from '../../theme';
import type { Language } from '../../i18n';

/** Nom du jour dans la langue courante (4 octobre 2026 est un dimanche). */
const weekdayName = (weekday: number): string =>
  new Date(2026, 9, 4 + weekday).toLocaleDateString(dateLocale(), { weekday: 'long' });

const sameWeek = (a: AvailabilitySlot[], b: AvailabilitySlot[]): boolean =>
  JSON.stringify(sortSlots(a)) === JSON.stringify(sortSlots(b));

export const MyAvailabilityScreen = ({ navigation }: any) => {
  const { t, language } = useI18n();
  const theme = useTheme();
  const { showToast } = useToast();
  const styles = useMemo(() => createStyles(theme, language), [theme, language]);

  const [saved, setSaved] = useState<AvailabilitySlot[]>([]);
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  // Formulaire d'ajout ouvert pour un jour (un seul à la fois)
  const [addingDay, setAddingDay] = useState<number | null>(null);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('12:00');

  const load = useCallback(async () => {
    try {
      const data = await availabilityService.getMine();
      setSaved(data);
      setSlots(data);
    } catch (error) {
      Alert.alert(t('common.error'), getApiErrorMessage(error, t('availability.loadFailed')));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const problemText = (problem: AvailabilityProblem): string => {
    if (problem.kind === 'format') return t('availability.badFormat');
    if (problem.kind === 'backwards') return t('availability.backwards');
    return t('availability.overlap', {
      day: weekdayName(problem.first.weekday),
      first: `${problem.first.startTime} – ${problem.first.endTime}`,
      second: `${problem.second.startTime} – ${problem.second.endTime}`,
    });
  };

  const openAdd = (weekday: number) => {
    setAddingDay(weekday);
    setStartTime('09:00');
    setEndTime('12:00');
  };

  const confirmAdd = () => {
    if (addingDay === null) return;
    const next = [...slots, { weekday: addingDay, startTime: startTime.trim(), endTime: endTime.trim() }];
    const problem = findAvailabilityProblem(next);
    if (problem) {
      Alert.alert(t('availability.invalidTitle'), problemText(problem));
      return;
    }
    setSlots(sortSlots(next));
    setAddingDay(null);
  };

  const remove = (target: AvailabilitySlot) =>
    setSlots((current) => current.filter((slot) => slot !== target));

  const save = async () => {
    const problem = findAvailabilityProblem(slots);
    if (problem) {
      Alert.alert(t('availability.invalidTitle'), problemText(problem));
      return;
    }
    try {
      setSaving(true);
      const stored = await availabilityService.replaceMine(sortSlots(slots));
      setSaved(stored);
      setSlots(stored);
      showToast(t('availability.saved'));
    } catch (error) {
      Alert.alert(t('common.error'), getApiErrorMessage(error, t('availability.saveFailed')));
    } finally {
      setSaving(false);
    }
  };

  const dirty = !sameWeek(saved, slots);

  const renderDay = (weekday: number) => {
    const daySlots = slots.filter((slot) => slot.weekday === weekday);
    const name = weekdayName(weekday);
    return (
      <Card key={weekday} style={styles.card} testID={`availability-day-${weekday}`}>
        <Text style={styles.day} accessibilityRole="header">
          {name}
        </Text>
        {daySlots.length === 0 ? (
          <Text style={styles.none}>{t('availability.none')}</Text>
        ) : (
          daySlots.map((slot) => (
            <ListRow
              key={`${slot.weekday}-${slot.startTime}`}
              title={`${slot.startTime} – ${slot.endTime}`}
              icon="time-outline"
              tone="telemetry"
              trailing={
                <Button
                  title={t('availability.remove')}
                  onPress={() => remove(slot)}
                  variant="ghost"
                  size="sm"
                  accessibilityLabel={t('availability.removeA11y', {
                    day: name,
                    range: `${slot.startTime} – ${slot.endTime}`,
                  })}
                  testID={`availability-remove-${slot.weekday}-${slot.startTime}`}
                />
              }
            />
          ))
        )}

        {addingDay === weekday ? (
          <View style={styles.form}>
            <View style={styles.times}>
              <Field
                label={t('availability.from')}
                value={startTime}
                onChangeText={setStartTime}
                placeholder="09:00"
                keyboardType="numbers-and-punctuation"
                maxLength={5}
                containerStyle={styles.time}
                testID="availability-start"
              />
              <Field
                label={t('availability.to')}
                value={endTime}
                onChangeText={setEndTime}
                placeholder="12:00"
                keyboardType="numbers-and-punctuation"
                maxLength={5}
                containerStyle={styles.time}
                testID="availability-end"
              />
            </View>
            <View style={styles.formActions}>
              <Button
                title={t('common.cancel')}
                onPress={() => setAddingDay(null)}
                variant="secondary"
                style={styles.action}
              />
              <Button
                title={t('availability.add')}
                onPress={confirmAdd}
                style={styles.action}
                testID="availability-confirm-add"
              />
            </View>
          </View>
        ) : (
          <Button
            title={t('availability.addRange')}
            onPress={() => openAdd(weekday)}
            variant="secondary"
            size="sm"
            icon="add"
            accessibilityLabel={t('availability.addRangeA11y', { day: name })}
            testID={`availability-add-${weekday}`}
          />
        )}
      </Card>
    );
  };

  return (
    <View style={styles.flex}>
      <AppBar
        title={t('availability.title')}
        onBack={() => navigation.goBack()}
        backLabel={t('common.back')}
      />
      {loading ? (
        <View style={styles.content}>
          <SkeletonCard lines={2} />
          <SkeletonCard lines={2} />
        </View>
      ) : (
        <>
          <ScrollView contentContainerStyle={styles.content}>
            <Text style={styles.intro}>{t('availability.intro')}</Text>
            {WEEK_ORDER.map(renderDay)}
          </ScrollView>
          <View style={styles.footer}>
            <Button
              title={t('availability.save')}
              onPress={save}
              loading={saving}
              disabled={!dirty || saving}
              fullWidth
              icon="save-outline"
              testID="availability-save"
            />
          </View>
        </>
      )}
    </View>
  );
};

const createStyles = (theme: Theme, language: Language) =>
  StyleSheet.create({
    flex: { flex: 1, backgroundColor: theme.colors.surface },
    content: { padding: theme.spacing.base, gap: theme.spacing.md },
    intro: { ...textStyle('body', language), color: theme.colors.textSecondary },
    card: { gap: theme.spacing.sm },
    day: { ...textStyle('label', language), color: theme.colors.textPrimary },
    none: { ...textStyle('caption', language), color: theme.colors.textMuted },
    form: { gap: theme.spacing.sm },
    times: { flexDirection: 'row', gap: theme.spacing.md },
    time: { flex: 1 },
    formActions: { flexDirection: 'row', gap: theme.spacing.sm },
    action: { flex: 1 },
    footer: {
      padding: theme.spacing.base,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.border,
      backgroundColor: theme.colors.surfaceRaised,
    },
  });
