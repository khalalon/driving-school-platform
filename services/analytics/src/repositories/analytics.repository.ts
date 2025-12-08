import { IDatabase } from '../config/database';
import {
  RevenueReport,
  LessonStats,
  ExamStats,
  StudentEngagement,
  InstructorPerformance,
  AnalyticsQuery,
} from '../types';

export interface IAnalyticsRepository {
  getRevenueReport(query: AnalyticsQuery): Promise<RevenueReport>;
  getLessonStats(query: AnalyticsQuery): Promise<LessonStats>;
  getExamStats(query: AnalyticsQuery): Promise<ExamStats>;
  getStudentEngagement(query: AnalyticsQuery): Promise<StudentEngagement[]>;
  getInstructorPerformance(query: AnalyticsQuery): Promise<InstructorPerformance[]>;
}

export class AnalyticsRepository implements IAnalyticsRepository {
  constructor(private db: IDatabase) {}

  async getRevenueReport(query: AnalyticsQuery): Promise<RevenueReport> {
    const { startDate, endDate, schoolId, instructorId } = query;

    const lessonRevenueQuery = `
      SELECT COALESCE(SUM(p.amount), 0) as revenue
      FROM payments p
      INNER JOIN lesson_bookings lb ON p.reference_id = lb.lesson_id
      INNER JOIN lessons l ON lb.lesson_id = l.id
      WHERE p.reference_type = 'lesson'
        AND p.status = 'paid'
        AND p.created_at BETWEEN $1 AND $2
        ${schoolId ? 'AND l.school_id = $3' : ''}
        ${instructorId ? 'AND l.instructor_id = $4' : ''}
    `;

    const examRevenueQuery = `
      SELECT COALESCE(SUM(p.amount), 0) as revenue
      FROM payments p
      INNER JOIN exam_registrations er ON p.reference_id = er.exam_id
      INNER JOIN exams e ON er.exam_id = e.id
      WHERE p.reference_type = 'exam'
        AND p.status = 'paid'
        AND p.created_at BETWEEN $1 AND $2
        ${schoolId ? 'AND e.school_id = $3' : ''}
    `;

    const params: any[] = [startDate, endDate];
    if (schoolId) params.push(schoolId);
    if (instructorId && !schoolId) params.push(null, instructorId);
    else if (instructorId) params.push(instructorId);

    const [lessonResult, examResult] = await Promise.all([
      this.db.query(lessonRevenueQuery, params),
      this.db.query(
        examRevenueQuery,
        schoolId ? [startDate, endDate, schoolId] : [startDate, endDate]
      ),
    ]);

    const lessonRevenue = parseFloat(lessonResult.rows[0].revenue || 0);
    const examRevenue = parseFloat(examResult.rows[0].revenue || 0);

    return {
      schoolId,
      instructorId,
      totalRevenue: lessonRevenue + examRevenue,
      lessonRevenue,
      examRevenue,
      periodStart: startDate,
      periodEnd: endDate,
    };
  }

  async getLessonStats(query: AnalyticsQuery): Promise<LessonStats> {
    const { startDate, endDate, schoolId } = query;

    const statsQuery = `
      SELECT 
        COUNT(*) as total_lessons,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
        COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled,
        type as lesson_type
      FROM lessons
      WHERE date_time BETWEEN $1 AND $2
        ${schoolId ? 'AND school_id = $3' : ''}
      GROUP BY type
    `;

    const attendanceQuery = `
      SELECT AVG(CASE WHEN attended THEN 1 ELSE 0 END) * 100 as avg_attendance
      FROM lesson_bookings lb
      INNER JOIN lessons l ON lb.lesson_id = l.id
      WHERE l.date_time BETWEEN $1 AND $2
        ${schoolId ? 'AND l.school_id = $3' : ''}
    `;

    const params = schoolId ? [startDate, endDate, schoolId] : [startDate, endDate];

    const [statsResult, attendanceResult] = await Promise.all([
      this.db.query(statsQuery, params),
      this.db.query(attendanceQuery, params),
    ]);

    const stats = statsResult.rows;
    let popularType = 'CODE';
    let maxCount = 0;

    let totalLessons = 0;
    let completedLessons = 0;
    let cancelledLessons = 0;

    stats.forEach((row: any) => {
      const count = parseInt(row.total_lessons);
      totalLessons += count;
      completedLessons += parseInt(row.completed || 0);
      cancelledLessons += parseInt(row.cancelled || 0);

      if (count > maxCount) {
        maxCount = count;
        popularType = row.lesson_type;
      }
    });

    return {
      totalLessons,
      completedLessons,
      cancelledLessons,
      averageAttendance: parseFloat(attendanceResult.rows[0]?.avg_attendance || 0),
      popularLessonType: popularType,
      popularTimeSlot: 'Morning', // Could be enhanced with actual time analysis
    };
  }

  async getExamStats(query: AnalyticsQuery): Promise<ExamStats> {
    const { startDate, endDate, schoolId } = query;

    const examStatsQuery = `
      SELECT 
        e.type,
        COUNT(*) as total,
        COUNT(CASE WHEN er.result = 'passed' THEN 1 END) as passed,
        COUNT(CASE WHEN er.result = 'failed' THEN 1 END) as failed,
        AVG(er.score) as avg_score
      FROM exam_registrations er
      INNER JOIN exams e ON er.exam_id = e.id
      WHERE e.date_time BETWEEN $1 AND $2
        AND er.result IN ('passed', 'failed')
        ${schoolId ? 'AND e.school_id = $3' : ''}
      GROUP BY e.type
    `;

    const params = schoolId ? [startDate, endDate, schoolId] : [startDate, endDate];
    const result = await this.db.query(examStatsQuery, params);

    let totalExams = 0;
    let totalPassed = 0;
    let totalFailed = 0;
    let totalScore = 0;
    let scoreCount = 0;

    const typeBreakdown = {
      theory: { passed: 0, failed: 0 },
      practical: { passed: 0, failed: 0 },
    };

    result.rows.forEach((row: any) => {
      const total = parseInt(row.total);
      const passed = parseInt(row.passed);
      const failed = parseInt(row.failed);

      totalExams += total;
      totalPassed += passed;
      totalFailed += failed;

      if (row.avg_score) {
        totalScore += parseFloat(row.avg_score) * total;
        scoreCount += total;
      }

      if (row.type === 'theory') {
        typeBreakdown.theory = { passed, failed };
      } else if (row.type === 'practical') {
        typeBreakdown.practical = { passed, failed };
      }
    });

    const totalResults = totalPassed + totalFailed;

    return {
      totalExams,
      passRate: totalResults > 0 ? (totalPassed / totalResults) * 100 : 0,
      failRate: totalResults > 0 ? (totalFailed / totalResults) * 100 : 0,
      averageScore: scoreCount > 0 ? totalScore / scoreCount : 0,
      typeBreakdown,
    };
  }

  async getStudentEngagement(query: AnalyticsQuery): Promise<StudentEngagement[]> {
    const { startDate, endDate, schoolId } = query;

    const engagementQuery = `
      SELECT 
        s.id as student_id,
        s.name,
        COUNT(lb.id) as total_bookings,
        COUNT(CASE WHEN lb.attended THEN 1 END) * 100.0 / NULLIF(COUNT(lb.id), 0) as attendance_rate,
        MAX(l.date_time) as last_booking_date
      FROM students s
      LEFT JOIN lesson_bookings lb ON s.id = lb.student_id
      LEFT JOIN lessons l ON lb.lesson_id = l.id
      WHERE l.date_time BETWEEN $1 AND $2
        ${schoolId ? 'AND s.school_id = $3' : ''}
      GROUP BY s.id, s.name
      HAVING COUNT(lb.id) > 0
      ORDER BY total_bookings DESC
      LIMIT 100
    `;

    const params = schoolId ? [startDate, endDate, schoolId] : [startDate, endDate];
    const result = await this.db.query(engagementQuery, params);

    return result.rows.map((row: any) => ({
      studentId: row.student_id,
      totalBookings: parseInt(row.total_bookings),
      attendanceRate: parseFloat(row.attendance_rate || 0),
      lastBookingDate: row.last_booking_date,
    }));
  }

  async getInstructorPerformance(query: AnalyticsQuery): Promise<InstructorPerformance[]> {
    const { startDate, endDate, schoolId } = query;

    const performanceQuery = `
      SELECT 
        i.id as instructor_id,
        i.name,
        COUNT(l.id) as total_lessons,
        COUNT(CASE WHEN l.status = 'completed' THEN 1 END) as completed_lessons,
        AVG(lb.rating) as avg_rating,
        COALESCE(SUM(p.amount), 0) as revenue
      FROM instructors i
      LEFT JOIN lessons l ON i.id = l.instructor_id
      LEFT JOIN lesson_bookings lb ON l.id = lb.lesson_id
      LEFT JOIN payments p ON l.id = p.reference_id AND p.reference_type = 'lesson' AND p.status = 'paid'
      WHERE l.date_time BETWEEN $1 AND $2
        ${schoolId ? 'AND i.school_id = $3' : ''}
      GROUP BY i.id, i.name
      ORDER BY revenue DESC
      LIMIT 100
    `;

    const params = schoolId ? [startDate, endDate, schoolId] : [startDate, endDate];
    const result = await this.db.query(performanceQuery, params);

    return result.rows.map((row: any) => ({
      instructorId: row.instructor_id,
      name: row.name,
      totalLessons: parseInt(row.total_lessons || 0),
      completedLessons: parseInt(row.completed_lessons || 0),
      averageRating: parseFloat(row.avg_rating || 0),
      revenue: parseFloat(row.revenue || 0),
    }));
  }
}
