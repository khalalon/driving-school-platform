import { Pool } from 'pg';
import { DatabaseConfig } from '../config/database.config';
import { StudentLessonStats, LessonCompletedDTO } from '../types';

export interface IStatsRepository {
  findByStudentAndSchool(studentId: string, schoolId: string): Promise<StudentLessonStats | null>;
  incrementLessonCount(studentId: string, data: LessonCompletedDTO): Promise<StudentLessonStats>;
}

export class StatsRepository implements IStatsRepository {
  private readonly db: Pool;

  constructor() {
    this.db = DatabaseConfig.getInstance();
  }

  async findByStudentAndSchool(
    studentId: string,
    schoolId: string
  ): Promise<StudentLessonStats | null> {
    const query = `
      SELECT 
        id,
        student_id as "studentId",
        school_id as "schoolId",
        completed_lessons as "completedLessons",
        completed_theory_lessons as "completedTheoryLessons",
        completed_practical_lessons as "completedPracticalLessons",
        last_lesson_date as "lastLessonDate",
        updated_at as "updatedAt"
      FROM student_lesson_stats
      WHERE student_id = $1 AND school_id = $2
    `;

    const result = await this.db.query(query, [studentId, schoolId]);
    return result.rows[0] || null;
  }

  async incrementLessonCount(
    studentId: string,
    data: LessonCompletedDTO
  ): Promise<StudentLessonStats> {
    if (!data.attended) {
      // Don't increment if not attended
      const existing = await this.findByStudentAndSchool(studentId, data.schoolId);
      if (!existing) {
        throw new Error('Student stats not found');
      }
      return existing;
    }

    const isTheory = data.lessonType === 'CODE';
    const isPractical = data.lessonType === 'MANOEUVRE' || data.lessonType === 'PARC';

    const query = `
      INSERT INTO student_lesson_stats (
        student_id, school_id, completed_lessons, 
        completed_theory_lessons, completed_practical_lessons, 
        last_lesson_date, updated_at
      )
      VALUES ($1, $2, 1, $3, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT (student_id, school_id)
      DO UPDATE SET
        completed_lessons = student_lesson_stats.completed_lessons + 1,
        completed_theory_lessons = student_lesson_stats.completed_theory_lessons + $3,
        completed_practical_lessons = student_lesson_stats.completed_practical_lessons + $4,
        last_lesson_date = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      RETURNING 
        id,
        student_id as "studentId",
        school_id as "schoolId",
        completed_lessons as "completedLessons",
        completed_theory_lessons as "completedTheoryLessons",
        completed_practical_lessons as "completedPracticalLessons",
        last_lesson_date as "lastLessonDate",
        updated_at as "updatedAt"
    `;

    const result = await this.db.query(query, [
      studentId,
      data.schoolId,
      isTheory ? 1 : 0,
      isPractical ? 1 : 0,
    ]);

    return result.rows[0];
  }
}
