import { Pool } from 'pg';
import { Exam, CreateExamDTO, UpdateExamDTO, ExamFilters } from '../types';

export interface IExamRepository {
  create(dto: CreateExamDTO): Promise<Exam>;
  findById(id: string): Promise<Exam | null>;
  findAll(filters: ExamFilters): Promise<Exam[]>;
  update(id: string, dto: UpdateExamDTO): Promise<Exam>;
  delete(id: string): Promise<void>;
  countRegistrations(examId: string): Promise<number>;
}

export class ExamRepository implements IExamRepository {
  constructor(private readonly db: Pool) {}

  async create(dto: CreateExamDTO): Promise<Exam> {
    const query = `
      INSERT INTO exams (
        school_id, type, date_time, examiner_id, price, capacity,
        created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING 
        id,
        school_id as "schoolId",
        type,
        date_time as "dateTime",
        examiner_id as "examinerId",
        price,
        capacity,
        created_at as "createdAt",
        updated_at as "updatedAt"
    `;

    const result = await this.db.query(query, [
      dto.schoolId,
      dto.type,
      dto.dateTime,
      dto.examinerId || null,
      dto.price,
      dto.capacity || null,
    ]);

    return result.rows[0] as Exam;
  }

  async findById(id: string): Promise<Exam | null> {
    const query = `
      SELECT 
        id,
        school_id as "schoolId",
        type,
        date_time as "dateTime",
        examiner_id as "examinerId",
        price,
        capacity,
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM exams
      WHERE id = $1
    `;

    const result = await this.db.query(query, [id]);
    return result.rows[0] || null;
  }

  async findAll(filters: ExamFilters): Promise<Exam[]> {
    const conditions: string[] = [];
    const values: unknown[] = [];
    let paramCount = 1;

    if (filters.schoolId) {
      conditions.push(`school_id = $${paramCount++}`);
      values.push(filters.schoolId);
    }
    if (filters.type) {
      conditions.push(`type = $${paramCount++}`);
      values.push(filters.type);
    }
    if (filters.dateFrom) {
      conditions.push(`date_time >= $${paramCount++}`);
      values.push(filters.dateFrom);
    }
    if (filters.dateTo) {
      conditions.push(`date_time <= $${paramCount++}`);
      values.push(filters.dateTo);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const query = `
      SELECT 
        id,
        school_id as "schoolId",
        type,
        date_time as "dateTime",
        examiner_id as "examinerId",
        price,
        capacity,
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM exams
      ${whereClause}
      ORDER BY date_time ASC
    `;

    const result = await this.db.query(query, values);
    return result.rows as Exam[];
  }

  async update(id: string, dto: UpdateExamDTO): Promise<Exam> {
    const updates: string[] = [];
    const values: unknown[] = [];
    let paramCount = 1;

    if (dto.dateTime !== undefined) {
      updates.push(`date_time = $${paramCount++}`);
      values.push(dto.dateTime);
    }
    if (dto.examinerId !== undefined) {
      updates.push(`examiner_id = $${paramCount++}`);
      values.push(dto.examinerId);
    }
    if (dto.price !== undefined) {
      updates.push(`price = $${paramCount++}`);
      values.push(dto.price);
    }
    if (dto.capacity !== undefined) {
      updates.push(`capacity = $${paramCount++}`);
      values.push(dto.capacity);
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const query = `
      UPDATE exams
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING 
        id,
        school_id as "schoolId",
        type,
        date_time as "dateTime",
        examiner_id as "examinerId",
        price,
        capacity,
        created_at as "createdAt",
        updated_at as "updatedAt"
    `;

    const result = await this.db.query(query, values);
    return result.rows[0] as Exam;
  }

  async delete(id: string): Promise<void> {
    const query = 'DELETE FROM exams WHERE id = $1';
    await this.db.query(query, [id]);
  }

  async countRegistrations(examId: string): Promise<number> {
    const query = `
      SELECT COUNT(*) as count
      FROM exam_registrations
      WHERE exam_id = $1
    `;

    const result = await this.db.query(query, [examId]);
    return parseInt(result.rows[0].count, 10);
  }
}
