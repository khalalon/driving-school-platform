import { Pool } from 'pg';
import { Queryable } from '../../../db/transaction';
import { SchoolCode } from '../types/school.types';

export interface ISchoolCodeRepository {
  /**
   * Consomme un code valide (actif, non expiré, quota non atteint) : `uses_count + 1`, en une
   * seule instruction — deux inscriptions simultanées ne peuvent pas dépasser `max_uses`.
   * `null` si le code est inconnu ou invalide. `executor` : client d'une transaction (D-17).
   */
  consume(code: string, executor?: Queryable): Promise<SchoolCode | null>;
}

const CODE_COLUMNS = `id, school_id AS "schoolId", code, role, max_uses AS "maxUses",
  uses_count AS "usesCount", expires_at AS "expiresAt", is_active AS "isActive",
  created_at AS "createdAt", updated_at AS "updatedAt"`;

export class SchoolCodeRepository implements ISchoolCodeRepository {
  constructor(private readonly db: Pool) {}

  async consume(code: string, executor: Queryable = this.db): Promise<SchoolCode | null> {
    const result = await executor.query<SchoolCode>(
      `UPDATE school_codes
       SET uses_count = uses_count + 1, updated_at = CURRENT_TIMESTAMP
       WHERE code = $1
         AND is_active = TRUE
         AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
         AND (max_uses IS NULL OR uses_count < max_uses)
       RETURNING ${CODE_COLUMNS}`,
      [code]
    );
    return result.rows[0] ?? null;
  }
}
