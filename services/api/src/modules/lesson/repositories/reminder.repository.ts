import { Pool } from 'pg';
import { LessonType } from '../../../types/domain';
import { SCHOOL_TIMEZONE } from './lesson.repository';

/** Une leçon à rappeler : l'élève (users.id) et ce que dit le message. */
export interface DueReminder {
  lessonId: string;
  studentUserId: string;
  type: LessonType;
  scheduledDate: Date;
}

/**
 * Rappels de leçon (17.5, D-65). Dans le module `lesson`, parce qu'il lit et écrit `lessons` ;
 * la tâche planifiée du module `notification` le reçoit par injection.
 */
export interface IReminderRepository {
  /**
   * **Réserve** les leçons planifiées le jour `day` (heure de l'école, `YYYY-MM-DD`) qui n'ont pas
   * encore eu leur rappel, et les renvoie : sélection et marquage dans **une seule** instruction,
   * si bien qu'aucune leçon ne peut être rappelée deux fois, même par deux instances en même
   * temps.
   */
  claimDue(day: string, sentAt: Date): Promise<DueReminder[]>;
}

export class ReminderRepository implements IReminderRepository {
  constructor(private readonly db: Pool) {}

  /**
   * `scheduled_date` est un horodatage UTC sans fuseau (007) : il passe en heure de l'école avant
   * d'être comparé au jour visé, comme pour les créneaux libres (L10). Une leçon à 00:30 heure de
   * Tunis est bien « demain » pour Tunis, même si c'est encore « aujourd'hui » en UTC.
   */
  async claimDue(day: string, sentAt: Date): Promise<DueReminder[]> {
    const result = await this.db.query<DueReminder>(
      `UPDATE lessons l
       SET reminder_sent_at = $2
       FROM students s
       WHERE s.id = l.student_id
         AND l.status = 'scheduled'
         AND l.reminder_sent_at IS NULL
         AND l.scheduled_date IS NOT NULL
         AND ((l.scheduled_date AT TIME ZONE 'UTC') AT TIME ZONE '${SCHOOL_TIMEZONE}')::date = $1::date
       RETURNING l.id AS "lessonId", s.user_id AS "studentUserId", l.type,
                 l.scheduled_date AS "scheduledDate"`,
      [day, sentAt]
    );
    return result.rows;
  }
}
