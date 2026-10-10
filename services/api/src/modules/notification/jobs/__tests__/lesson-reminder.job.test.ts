import { NotificationType, Notifier } from '../../types/notification.types';
import {
  JobLock,
  LessonReminderJob,
  ReminderSource,
  REMINDER_INTERVAL_MS,
  schoolClock,
  startLessonReminders,
} from '../lesson-reminder.job';

/**
 * Rappel de la veille à 18 h, heure de l'école (17.5, D-65). L'horloge est injectée : chaque cas
 * se joue à une heure précise, sans attendre le soir. Tunis = UTC+1 toute l'année.
 */
describe('rappel de leçon (17.5, D-65)', () => {
  /** 17:59 et 18:00 à Tunis le 14 octobre 2026. */
  const beforeSix = new Date('2026-10-14T16:59:00Z');
  const atSix = new Date('2026-10-14T17:00:00Z');

  const due = {
    lessonId: 'lesson-1',
    studentUserId: 'user-1',
    type: 'Parc',
    // 10:00 à Tunis le 15 octobre
    scheduledDate: new Date('2026-10-15T09:00:00Z'),
  };

  let source: jest.Mocked<ReminderSource>;
  let notifier: jest.Mocked<Notifier>;
  let lock: jest.Mocked<JobLock>;
  let warnings: string[];

  const job = (now: Date) =>
    new LessonReminderJob(
      source,
      notifier,
      lock,
      () => now,
      (line) => warnings.push(line)
    );

  beforeEach(() => {
    source = { claimDue: jest.fn().mockResolvedValue([due]) };
    notifier = { notify: jest.fn().mockResolvedValue(undefined) };
    lock = {
      acquire: jest.fn().mockResolvedValue('jeton'),
      release: jest.fn().mockResolvedValue(undefined),
    };
    warnings = [];
  });

  it('avant 18 h (heure de l’école) : rien, pas même le verrou', async () => {
    await expect(job(beforeSix).runOnce()).resolves.toBe(0);

    expect(lock.acquire).not.toHaveBeenCalled();
    expect(source.claimDue).not.toHaveBeenCalled();
  });

  it('à 18 h : les leçons du lendemain sont réservées puis rappelées, en heure de l’école', async () => {
    await expect(job(atSix).runOnce()).resolves.toBe(1);

    expect(source.claimDue).toHaveBeenCalledWith('2026-10-15', atSix);
    expect(notifier.notify).toHaveBeenCalledWith(['user-1'], {
      type: NotificationType.LESSON_REMINDER,
      params: { type: { fr: 'Parc', ar: 'الحلبة' }, time: '10:00' },
      target: { screen: 'MyLessons', id: 'lesson-1' },
    });
    expect(lock.release).toHaveBeenCalledWith('jobs:lesson-reminder', 'jeton');
  });

  it('une autre instance tient le verrou : on passe son tour', async () => {
    lock.acquire.mockResolvedValue(null);

    await expect(job(atSix).runOnce()).resolves.toBe(0);

    expect(source.claimDue).not.toHaveBeenCalled();
    expect(lock.release).not.toHaveBeenCalled();
  });

  it('rattrapage : un passage à 23 h 45 rappelle encore les leçons du lendemain', async () => {
    const lateEvening = new Date('2026-10-14T22:45:00Z');

    await job(lateEvening).runOnce();

    expect(source.claimDue).toHaveBeenCalledWith('2026-10-15', lateEvening);
  });

  it('après minuit ce n’est plus « la veille » : 00 h 30 ne rappelle rien', async () => {
    // 00:30 à Tunis le 15 = 23:30 UTC le 14 : le jour de l'école a déjà changé
    await expect(job(new Date('2026-10-14T23:30:00Z')).runOnce()).resolves.toBe(0);
    expect(source.claimDue).not.toHaveBeenCalled();
  });

  it('une erreur ne tue pas la tâche : journalisée, verrou rendu, passage suivant intact', async () => {
    source.claimDue.mockRejectedValue(new Error('base indisponible'));

    await expect(job(atSix).runOnce()).resolves.toBe(0);

    expect(warnings.join(' ')).toContain('base indisponible');
    expect(lock.release).toHaveBeenCalledTimes(1);
  });

  it('un verrou impossible à rendre ne fait pas échouer le passage (il expirera seul)', async () => {
    lock.release.mockRejectedValue(new Error('Redis coupé'));

    await expect(job(atSix).runOnce()).resolves.toBe(1);
  });

  it('aucune leçon le lendemain : aucun envoi', async () => {
    source.claimDue.mockResolvedValue([]);

    await expect(job(atSix).runOnce()).resolves.toBe(0);
    expect(notifier.notify).not.toHaveBeenCalled();
  });
});

describe('horloge de l’école', () => {
  it('jour, heure et lendemain à Tunis, quel que soit le fuseau du serveur', () => {
    expect(schoolClock(new Date('2026-10-14T17:00:00Z'))).toEqual({
      day: '2026-10-14',
      hour: 18,
      tomorrow: '2026-10-15',
    });
    // 23:30 UTC le 31 décembre = 00:30 à Tunis le 1er janvier : changement de jour et d'année
    expect(schoolClock(new Date('2026-12-31T23:30:00Z'))).toEqual({
      day: '2027-01-01',
      hour: 0,
      tomorrow: '2027-01-02',
    });
    // Fin février d'une année non bissextile
    expect(schoolClock(new Date('2027-02-28T19:00:00Z')).tomorrow).toBe('2027-03-01');
  });
});

describe('démarrage de la tâche', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('un passage tout de suite, puis un toutes les 15 min, et l’arrêt fonctionne', () => {
    const runOnce = jest.fn().mockResolvedValue(0);
    const fakeJob = { runOnce } as unknown as LessonReminderJob;

    const stop = startLessonReminders(fakeJob);
    expect(runOnce).toHaveBeenCalledTimes(1);

    jest.advanceTimersByTime(REMINDER_INTERVAL_MS);
    expect(runOnce).toHaveBeenCalledTimes(2);

    stop();
    jest.advanceTimersByTime(3 * REMINDER_INTERVAL_MS);
    expect(runOnce).toHaveBeenCalledTimes(2);
  });
});
