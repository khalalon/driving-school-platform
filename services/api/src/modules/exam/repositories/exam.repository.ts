import { Pool } from 'pg';
import { CreateExamDTO, Exam, ExamFilters, UpdateExamDTO } from '../types/exam.types';

export interface IExamRepository {
  create(dto: CreateExamDTO): Promise<Exam>;
  findById(id: string): Promise<Exam | null>;
  findAll(filters: ExamFilters): Promise<Exam[]>;
  update(id: string, dto: UpdateExamDTO): Promise<Exam>;
  delete(id: string): Promise<void>;
  countRegistrations(examId: string): Promise<number>;
}

const EXAM_COLUMNS = `id, school_id AS "schoolId", type, date_time AS "dateTime",
  examiner_id AS "examinerId", price::float8 AS price, capacity,
  created_at AS "createdAt", updated_at AS "updatedAt"`;

export class ExamRepository implements IExamRepository {
  constructor(private readonly db: Pool) {}

  async create(dto: CreateExamDTO): Promise<Exam> {
    const result = await this.db.query<Exam>(
      `INSERT INTO exams (school_id, type, date_time, examiner_id, price, capacity, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       RETURNING ${EXAM_COLUMNS}`,
      [
        dto.schoolId,
        dto.type,
        dto.dateTime,
        dto.examinerId ?? null,
        dto.price,
        dto.capacity ?? null,
      ]
    );
    return result.rows[0];
  }

  async findById(id: string): Promise<Exam | null> {
    const result = await this.db.query<Exam>(`SELECT ${EXAM_COLUMNS} FROM exams WHERE id = $1`, [
      id,
    ]);
    return result.rows[0] ?? null;
  }

  async findAll(filters: ExamFilters): Promise<Exam[]> {
    const conditions: string[] = [];
    const values: unknown[] = [];
    const add = (column: string, operator: string, value: unknown): void => {
      values.push(value);
      conditions.push(`${column} ${operator} $${values.length}`);
    };

    if (filters.schoolId) add('school_id', '=', filters.schoolId);
    if (filters.type) add('type', '=', filters.type);
    if (filters.dateFrom) add('date_time', '>=', filters.dateFrom);
    if (filters.dateTo) add('date_time', '<=', filters.dateTo);

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const result = await this.db.query<Exam>(
      `SELECT ${EXAM_COLUMNS} FROM exams ${where} ORDER BY date_time ASC`,
      values
    );
    return result.rows;
  }

  async update(id: string, dto: UpdateExamDTO): Promise<Exam> {
    const updates: string[] = [];
    const values: unknown[] = [];
    const set = (column: string, value: unknown): void => {
      values.push(value);
      updates.push(`${column} = $${values.length}`);
    };

    if (dto.dateTime !== undefined) set('date_time', dto.dateTime);
    if (dto.examinerId !== undefined) set('examiner_id', dto.examinerId);
    if (dto.price !== undefined) set('price', dto.price);
    if (dto.capacity !== undefined) set('capacity', dto.capacity);
    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);

    const result = await this.db.query<Exam>(
      `UPDATE exams SET ${updates.join(', ')} WHERE id = $${values.length} RETURNING ${EXAM_COLUMNS}`,
      values
    );
    return result.rows[0];
  }

  async delete(id: string): Promise<void> {
    await this.db.query('DELETE FROM exams WHERE id = $1', [id]);
  }

  async countRegistrations(examId: string): Promise<number> {
    const result = await this.db.query<{ count: string }>(
      'SELECT COUNT(*) AS count FROM exam_registrations WHERE exam_id = $1',
      [examId]
    );
    return Number(result.rows[0].count);
  }
}
