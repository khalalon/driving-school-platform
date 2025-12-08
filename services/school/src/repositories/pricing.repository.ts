import { Pool } from 'pg';
import { DatabaseConfig } from '../config/database.config';
import { Pricing, SetPricingDTO, LessonType } from '../types';

export interface IPricingRepository {
  setPricing(schoolId: string, data: SetPricingDTO): Promise<Pricing>;
  findBySchoolId(schoolId: string): Promise<Pricing[]>;
  findBySchoolAndType(schoolId: string, lessonType: LessonType): Promise<Pricing | null>;
  delete(id: string): Promise<void>;
}

export class PricingRepository implements IPricingRepository {
  private readonly db: Pool;

  constructor() {
    this.db = DatabaseConfig.getInstance();
  }

  async setPricing(schoolId: string, data: SetPricingDTO): Promise<Pricing> {
    const result = await this.db.query(
      `INSERT INTO pricing (school_id, lesson_type, price, duration)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (school_id, lesson_type)
       DO UPDATE SET price = EXCLUDED.price,
                     duration = EXCLUDED.duration,
                     updated_at = NOW()
       RETURNING *`,
      [schoolId, data.lessonType, data.price, data.duration]
    );

    return result.rows[0];
  }

  async findBySchoolId(schoolId: string): Promise<Pricing[]> {
    const result = await this.db.query(
      `SELECT * FROM pricing WHERE school_id = $1 ORDER BY created_at DESC`,
      [schoolId]
    );
    return result.rows;
  }

  async findBySchoolAndType(schoolId: string, lessonType: LessonType): Promise<Pricing | null> {
    const result = await this.db.query(
      `SELECT * FROM pricing WHERE school_id = $1 AND lesson_type = $2`,
      [schoolId, lessonType]
    );
    return result.rows[0] || null;
  }

  async delete(id: string): Promise<void> {
    await this.db.query(`DELETE FROM pricing WHERE id = $1`, [id]);
  }
}
