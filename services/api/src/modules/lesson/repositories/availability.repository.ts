import { Pool } from 'pg';
import { ITransactionRunner } from '../../../db/transaction';
import { AvailabilitySlot } from '../types/availability.types';

export interface IAvailabilityRepository {
  /** Semaine type d'un instructeur, triée par jour puis heure de début. */
  findByInstructor(instructorId: string): Promise<AvailabilitySlot[]>;
  /** Remplace toute la semaine type dans une transaction (suppression puis insertions). */
  replace(instructorId: string, slots: AvailabilitySlot[]): Promise<AvailabilitySlot[]>;
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
