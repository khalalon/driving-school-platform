import { Pool } from 'pg';
import { ITransactionRunner } from '../../../db/transaction';
import { AvailabilitySlot, FreeSlot, FreeSlotsFilter } from '../types/availability.types';
import { SCHOOL_TIMEZONE } from './lesson.repository';

export interface IAvailabilityRepository {
  /** Semaine type d'un instructeur, triée par jour puis heure de début. */
  findByInstructor(instructorId: string): Promise<AvailabilitySlot[]>;
  /** Remplace toute la semaine type dans une transaction (suppression puis insertions). */
  replace(instructorId: string, slots: AvailabilitySlot[]): Promise<AvailabilitySlot[]>;
  /** L10 : créneaux libres des instructeurs d'une école (voir `findFreeSlots`). */
  findFreeSlots(filter: FreeSlotsFilter): Promise<FreeSlot[]>;
}

/** Heures relues en `HH:MM` (la colonne TIME renverrait `HH:MM:SS`). */
const SLOT_COLUMNS = `weekday, to_char(start_time, 'HH24:MI') AS "startTime",
  to_char(end_time, 'HH24:MI') AS "endTime"`;

export class AvailabilityRepository implements IAvailabilityRepository {
  constructor(
    private readonly db: Pool,
    private readonly transactions: ITransactionRunner
  ) {}

  async findByInstructor(instructorId: string): Promise<AvailabilitySlot[]> {
    const result = await this.db.query<AvailabilitySlot>(
      `SELECT ${SLOT_COLUMNS} FROM instructor_availability
       WHERE instructor_id = $1
       ORDER BY weekday ASC, start_time ASC`,
      [instructorId]
    );
    return result.rows;
  }

  /**
   * L10 (15.7, D-60) : pour chaque jour de [from, to[ **en heure de l'école**, chaque plage de
   * disponibilité des instructeurs de l'école est découpée en créneaux consécutifs de la durée
   * demandée (le dernier finit au plus tard à la fin de la plage). Les créneaux sont convertis
   * en UTC (format de `lessons.scheduled_date`), gardés s'ils commencent dans [from, to[ et dans
   * le futur, et retirés s'ils chevauchent une leçon `scheduled` de leur instructeur. Triés par
   * heure puis par instructeur. Postgres fait la conversion de fuseau (`AT TIME ZONE`).
   */
  async findFreeSlots(filter: FreeSlotsFilter): Promise<FreeSlot[]> {
    const result = await this.db.query<FreeSlot>(
      `WITH params AS (
         SELECT $1::timestamp AS from_utc, $2::timestamp AS to_utc, $3::uuid AS school_id,
                make_interval(mins => $4::int) AS len
       ),
       days AS (
         SELECT d::date AS day
         FROM params,
              generate_series(
                ((from_utc AT TIME ZONE 'UTC') AT TIME ZONE '${SCHOOL_TIMEZONE}')::date,
                ((to_utc AT TIME ZONE 'UTC') AT TIME ZONE '${SCHOOL_TIMEZONE}')::date,
                interval '1 day'
              ) d
       ),
       slots AS (
         SELECT a.instructor_id,
                ((s AT TIME ZONE '${SCHOOL_TIMEZONE}') AT TIME ZONE 'UTC') AS start_utc
         FROM params p
         JOIN instructors i ON i.school_id = p.school_id
         JOIN instructor_availability a ON a.instructor_id = i.id
         JOIN days ON EXTRACT(DOW FROM days.day) = a.weekday
         CROSS JOIN LATERAL generate_series(
           days.day + a.start_time, days.day + a.end_time - p.len, p.len
         ) s
       )
       SELECT s.start_utc AS start, s.start_utc + p.len AS "end",
              s.instructor_id AS "instructorId",
              COALESCE(u.first_name, '') AS "instructorFirstName",
              COALESCE(u.last_name, '') AS "instructorLastName"
       FROM slots s
       CROSS JOIN params p
       JOIN instructors i ON i.id = s.instructor_id
       LEFT JOIN users u ON u.id = i.user_id
       WHERE s.start_utc >= p.from_utc AND s.start_utc < p.to_utc
         AND s.start_utc > (now() AT TIME ZONE 'UTC')
         AND NOT EXISTS (
           SELECT 1 FROM lessons l
           WHERE l.instructor_id = s.instructor_id AND l.status = 'scheduled'
             AND l.scheduled_date < s.start_utc + p.len
             AND l.scheduled_date
                 + make_interval(mins => COALESCE(l.duration_minutes, 60)) > s.start_utc
         )
       ORDER BY s.start_utc ASC, u.last_name ASC, u.first_name ASC`,
      [filter.from, filter.to, filter.schoolId, filter.durationMinutes]
    );
    return result.rows;
  }

  async replace(instructorId: string, slots: AvailabilitySlot[]): Promise<AvailabilitySlot[]> {
    await this.transactions.run(async (tx) => {
      await tx.query(`DELETE FROM instructor_availability WHERE instructor_id = $1`, [
        instructorId,
      ]);
      for (const slot of slots) {
        await tx.query(
          `INSERT INTO instructor_availability (instructor_id, weekday, start_time, end_time)
           VALUES ($1, $2, $3, $4)`,
          [instructorId, slot.weekday, slot.startTime, slot.endTime]
        );
      }
    });
    return this.findByInstructor(instructorId);
  }
}
