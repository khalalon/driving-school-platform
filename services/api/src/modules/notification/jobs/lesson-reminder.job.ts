import { lessonTypeTerm, schoolTime } from '../services/terms';
import { NotificationType, Notifier } from '../types/notification.types';

/** Heure de l'école à partir de laquelle part le rappel du lendemain (D-65). */
export const REMINDER_HOUR = 18;
/** Fréquence de passage de la tâche : 15 min, le rappel part au plus tard à 18 h 15. */
export const REMINDER_INTERVAL_MS = 15 * 60 * 1000;
const SCHOOL_TIME_ZONE = 'Africa/Tunis';
/** Durée du verrou : plus longue qu'un passage, plus courte que l'intervalle. */
const LOCK_TTL_MS = 5 * 60 * 1000;
const LOCK_KEY = 'jobs:lesson-reminder';

/** Ce que la tâche attend du module lesson (`ReminderRepository`). */
export interface ReminderSource {
  claimDue(
    day: string,
    sentAt: Date
  ): Promise<{ lessonId: string; studentUserId: string; type: string; scheduledDate: Date }[]>;
}

/**
 * Verrou distribué : une seule instance de l'API passe à la fois. `acquire` renvoie un jeton à
 * rendre à `release`, ou `null` si une autre instance tient déjà le verrou.
 */
export interface JobLock {
  acquire(key: string, ttlMs: number): Promise<string | null>;
  release(key: string, token: string): Promise<void>;
}

/** Jour et heure **de l'école** pour un instant donné, quel que soit le fuseau du serveur. */
export function schoolClock(now: Date): { day: string; hour: number; tomorrow: string } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: SCHOOL_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now);
  const get = (type: string): string => parts.find((part) => part.type === type)?.value ?? '';

  const day = `${get('year')}-${get('month')}-${get('day')}`;
  // Lendemain calendaire : midi UTC du jour de l'école, plus 24 h — aucun changement d'heure ne
  // peut faire sauter ou doubler un jour à cette heure-là.
  const noon = new Date(`${day}T12:00:00Z`);
  const tomorrow = new Date(noon.getTime() + 24 * 3600 * 1000).toISOString().slice(0, 10);

  return { day, hour: Number(get('hour')), tomorrow };
}

/**
 * Rappel de la veille (17.5, D-65). Chaque passage :
 *
 * 1. ne fait **rien avant 18 h**, heure de l'école ;
 * 2. après 18 h, prend le verrou (une seule instance à la fois) ;
 * 3. **réserve** puis rappelle les leçons planifiées le lendemain qui n'ont pas eu leur rappel.
 *
 * Après 18 h, tout passage rattrape ce qui manque : une API redémarrée à 19 h 30 envoie encore
 * les rappels du soir, et une leçon planifiée à 21 h pour le lendemain a le sien au passage
 * suivant. Passé minuit, ce n'est plus « la veille » : la leçon du jour n'est plus rappelée.
 *
 * La réservation marque la leçon **avant** l'envoi : un push tombé ne refait jamais un rappel
 * (D-65 : un seul message). L'historique, lui, est écrit par le répartiteur dans tous les cas.
 */
export class LessonReminderJob {
  constructor(
    private readonly source: ReminderSource,
    private readonly notifier: Notifier,
    private readonly lock: JobLock,
    private readonly clock: () => Date = (): Date => new Date(),
    private readonly log: (message: string) => void = console.warn
  ) {}

  /** Un passage ; renvoie le nombre de rappels envoyés (0 avant 18 h ou sans verrou). */
  async runOnce(): Promise<number> {
    const now = this.clock();
    const { hour, tomorrow } = schoolClock(now);
    if (hour < REMINDER_HOUR) {
      return 0;
    }

    let token: string | null = null;
    try {
      token = await this.lock.acquire(LOCK_KEY, LOCK_TTL_MS);
      if (!token) {
        return 0;
      }

      const due = await this.source.claimDue(tomorrow, now);
      for (const reminder of due) {
        await this.notifier.notify([reminder.studentUserId], {
          type: NotificationType.LESSON_REMINDER,
          params: {
            type: lessonTypeTerm(reminder.type),
            time: schoolTime(reminder.scheduledDate),
          },
          target: { screen: 'MyLessons', id: reminder.lessonId },
        });
      }
      return due.length;
    } catch (error) {
      // Une tâche de fond qui lève tuerait le minuteur : on journalise et on attend le passage suivant.
      this.log(`[rappels] passage interrompu : ${String(error)}`);
      return 0;
    } finally {
      if (token) {
        await this.lock.release(LOCK_KEY, token).catch(() => undefined);
      }
    }
  }
}

/**
 * Lance la tâche : un passage tout de suite (rattrapage après un redémarrage), puis toutes les
 * 15 min. Renvoie de quoi l'arrêter (tests, arrêt propre du processus).
 */
export function startLessonReminders(
  job: LessonReminderJob,
  intervalMs: number = REMINDER_INTERVAL_MS
): () => void {
  void job.runOnce();
  const timer = setInterval(() => void job.runOnce(), intervalMs);
  // Le minuteur ne doit pas, à lui seul, garder le processus en vie.
  timer.unref();
  return () => clearInterval(timer);
}
