import { IAnalyticsRepository } from '../repositories/analytics.repository';
import { ICache } from '../config/redis';
import {
  RevenueReport,
  LessonStats,
  ExamStats,
  StudentEngagement,
  InstructorPerformance,
  AnalyticsQuery,
} from '../types';

export interface IAnalyticsService {
  getRevenueReport(query: AnalyticsQuery): Promise<RevenueReport>;
  getLessonStats(query: AnalyticsQuery): Promise<LessonStats>;
  getExamStats(query: AnalyticsQuery): Promise<ExamStats>;
  getStudentEngagement(query: AnalyticsQuery): Promise<StudentEngagement[]>;
  getInstructorPerformance(query: AnalyticsQuery): Promise<InstructorPerformance[]>;
}

export class AnalyticsService implements IAnalyticsService {
  private cacheTTL: number;

  constructor(
    private repository: IAnalyticsRepository,
    private cache: ICache
  ) {
    this.cacheTTL = parseInt(process.env.CACHE_TTL || '3600');
  }

  private getCacheKey(type: string, query: AnalyticsQuery): string {
    const { startDate, endDate, schoolId, instructorId, studentId } = query;
    return `analytics:${type}:${startDate.toISOString()}:${endDate.toISOString()}:${schoolId || 'all'}:${instructorId || 'all'}:${studentId || 'all'}`;
  }

  async getRevenueReport(query: AnalyticsQuery): Promise<RevenueReport> {
    const cacheKey = this.getCacheKey('revenue', query);
    const cached = await this.cache.get(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

    const report = await this.repository.getRevenueReport(query);
    await this.cache.set(cacheKey, JSON.stringify(report), this.cacheTTL);

    return report;
  }

  async getLessonStats(query: AnalyticsQuery): Promise<LessonStats> {
    const cacheKey = this.getCacheKey('lesson-stats', query);
    const cached = await this.cache.get(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

    const stats = await this.repository.getLessonStats(query);
    await this.cache.set(cacheKey, JSON.stringify(stats), this.cacheTTL);

    return stats;
  }

  async getExamStats(query: AnalyticsQuery): Promise<ExamStats> {
    const cacheKey = this.getCacheKey('exam-stats', query);
    const cached = await this.cache.get(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

    const stats = await this.repository.getExamStats(query);
    await this.cache.set(cacheKey, JSON.stringify(stats), this.cacheTTL);

    return stats;
  }

  async getStudentEngagement(query: AnalyticsQuery): Promise<StudentEngagement[]> {
    const cacheKey = this.getCacheKey('student-engagement', query);
    const cached = await this.cache.get(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

    const engagement = await this.repository.getStudentEngagement(query);
    await this.cache.set(cacheKey, JSON.stringify(engagement), this.cacheTTL);

    return engagement;
  }

  async getInstructorPerformance(query: AnalyticsQuery): Promise<InstructorPerformance[]> {
    const cacheKey = this.getCacheKey('instructor-performance', query);
    const cached = await this.cache.get(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

    const performance = await this.repository.getInstructorPerformance(query);
    await this.cache.set(cacheKey, JSON.stringify(performance), this.cacheTTL);

    return performance;
  }
}
