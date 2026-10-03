/**
 * Conflit d'horaire à la planification (15.4, D-58). L4 et L5 répondent 409
 * `SCHEDULE_CONFLICT` avec la leçon en conflit ; l'instructeur la voit (date, heures, élève) et
 * peut « Planifier quand même » : l'écran renvoie alors le même payload avec `force: true`.
 */

import { Alert } from 'react-native';
import { getScheduleConflict } from '../../../services/api/ApiError';
import { ScheduleConflict } from '../../../models/Lesson';
import { t } from '../../../i18n';
import { formatDate, formatPersonName, formatTime } from '../../../utils/format';

/** « Une leçon est déjà prévue le 6 oct. 2026, 09:00 – 10:00, avec Yasmine Amri. » */
export const scheduleConflictMessage = (conflict: ScheduleConflict): string => {
  const start = new Date(conflict.scheduledDate);
  const end = new Date(start.getTime() + (conflict.durationMinutes ?? 60) * 60_000).toISOString();
  return t('conflict.message', {
    date: formatDate(conflict.scheduledDate),
    start: formatTime(conflict.scheduledDate),
    end: formatTime(end),
    student: formatPersonName(conflict.student, t('attendance.theStudent')),
  });
};

/**
 * Si `error` est un conflit d'horaire, l'affiche et propose de planifier quand même
 * (`retryWithForce`) ; renvoie `true`. Sinon `false` : l'écran affiche son erreur habituelle.
 */
export const offerScheduleConflict = (error: unknown, retryWithForce: () => void): boolean => {
  const conflict = getScheduleConflict(error);
  if (!conflict) return false;
  Alert.alert(t('conflict.title'), scheduleConflictMessage(conflict), [
    { text: t('common.cancel'), style: 'cancel' },
    { text: t('conflict.forceAnyway'), onPress: retryWithForce },
  ]);
  return true;
};
