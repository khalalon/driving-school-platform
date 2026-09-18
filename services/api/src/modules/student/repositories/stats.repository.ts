import { Pool } from 'pg';
import { LessonType } from '../../../types/domain';
import { LessonCompletedDTO, StudentLessonStats } from '../types/student.types';

export interface IStatsRepository {
  findByStudentAndSchool(studentId: string, schoolId: string): Promise<StudentLessonStats | null>;
  incrementLessonCount(studentId: string, data: LessonCompletedDTO): Promise<StudentLessonStats>;
}

const STATS_COLUMNS = `id, student_id AS "studentId", school_id AS "schoolId",
  completed_lessons AS "completedLessons", completed_theory_lessons AS "completedTheoryLessons",
  completed_practical_lessons AS "completedPracticalLessons", last_lesson_date AS "lastLessonDate",
  updated_at AS "updatedAt"`;

/** Compteurs de leçons effectuées (`students.id`). Incrémentés seulement si l'élève était présent (D-33). */
export class StatsRepository implements IStatsRepository {
  constructor(private readonly db: Pool) {}

  async findByStudentAndSchool(
    studentId: string,
    schoolId: string
  ): Promise<StudentLessonStats | null> {
    const result = await this.db.query<StudentLessonStats>(
      `SELECT ${STATS_COLUMNS} FROM student_lesson_stats WHERE student_id = $1 AND school_id = $2`,
      [studentId, schoolId]
    );
    return result.rows[0] ?? null;
  }

  async incrementLessonCount(
    studentId: string,
    data: LessonCompletedDTO
  ): Promise<StudentLessonStats> {
    const isTheory = data.lessonType === LessonType.CODE ? 1 : 0;
    const isPractical = data.lessonType === LessonType.CODE ? 0 : 1;
    const result = await this.db.query<StudentLessonStats>(
      `INSERT INTO student_lesson_stats (
         student_id, school_id, completed_lessons, completed_theory_lessons,
         completed_practical_lessons, last_lesson_date, updated_at)
       VALUES ($1, $2, 1, $3, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       ON CONFLICT (student_id, school_id) DO UPDATE SET
         completed_lessons = student_lesson_stats.completed_lessons + 1,
         completed_theory_lessons = student_lesson_stats.completed_theory_lessons + $3,
         completed_practical_lessons = student_lesson_stats.completed_practical_lessons + $4,
         last_lesson_date = CURRENT_TIMESTAMP,
         updated_at = CURRENT_TIMESTAMP
       RETURNING ${STATS_COLUMNS}`,
      [studentId, data.schoolId, isTheory, isPractical]
    );
    return result.rows[0];
  }
}
