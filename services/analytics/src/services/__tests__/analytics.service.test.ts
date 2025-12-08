import { AnalyticsService } from '../analytics.service';
import { IAnalyticsRepository } from '../../repositories/analytics.repository';
import { ICache } from '../../config/redis';
import { AnalyticsQuery } from '../../types';

describe('AnalyticsService', () => {
  let service: AnalyticsService;
  let mockRepository: jest.Mocked<IAnalyticsRepository>;
  let mockCache: jest.Mocked<ICache>;

  beforeEach(() => {
    mockRepository = {
      getRevenueReport: jest.fn(),
      getLessonStats: jest.fn(),
      getExamStats: jest.fn(),
      getStudentEngagement: jest.fn(),
      getInstructorPerformance: jest.fn(),
    };

    mockCache = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
    };

    service = new AnalyticsService(mockRepository, mockCache);
  });

  describe('getRevenueReport', () => {
    it('should return cached data if available', async () => {
      const query: AnalyticsQuery = {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-12-31'),
      };

      const cachedData = {
        totalRevenue: 10000,
        lessonRevenue: 7000,
        examRevenue: 3000,
        periodStart: query.startDate,
        periodEnd: query.endDate,
      };

      mockCache.get.mockResolvedValue(JSON.stringify(cachedData));

      const result = await service.getRevenueReport(query);

      expect(result).toEqual(cachedData);
      expect(mockCache.get).toHaveBeenCalled();
      expect(mockRepository.getRevenueReport).not.toHaveBeenCalled();
    });

    it('should fetch from repository and cache if not cached', async () => {
      const query: AnalyticsQuery = {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-12-31'),
      };

      const repoData = {
        totalRevenue: 10000,
        lessonRevenue: 7000,
        examRevenue: 3000,
        periodStart: query.startDate,
        periodEnd: query.endDate,
      };

      mockCache.get.mockResolvedValue(null);
      mockRepository.getRevenueReport.mockResolvedValue(repoData);

      const result = await service.getRevenueReport(query);

      expect(result).toEqual(repoData);
      expect(mockRepository.getRevenueReport).toHaveBeenCalledWith(query);
      expect(mockCache.set).toHaveBeenCalled();
    });
  });

  describe('getLessonStats', () => {
    it('should return lesson statistics', async () => {
      const query: AnalyticsQuery = {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-12-31'),
      };

      const stats = {
        totalLessons: 100,
        completedLessons: 85,
        cancelledLessons: 15,
        averageAttendance: 90,
        popularLessonType: 'CODE',
        popularTimeSlot: 'Morning',
      };

      mockCache.get.mockResolvedValue(null);
      mockRepository.getLessonStats.mockResolvedValue(stats);

      const result = await service.getLessonStats(query);

      expect(result).toEqual(stats);
      expect(mockRepository.getLessonStats).toHaveBeenCalledWith(query);
    });
  });

  describe('getExamStats', () => {
    it('should return exam statistics', async () => {
      const query: AnalyticsQuery = {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-12-31'),
      };

      const stats = {
        totalExams: 50,
        passRate: 75,
        failRate: 25,
        averageScore: 82,
        typeBreakdown: {
          theory: { passed: 30, failed: 10 },
          practical: { passed: 8, failed: 2 },
        },
      };

      mockCache.get.mockResolvedValue(null);
      mockRepository.getExamStats.mockResolvedValue(stats);

      const result = await service.getExamStats(query);

      expect(result).toEqual(stats);
      expect(mockRepository.getExamStats).toHaveBeenCalledWith(query);
    });
  });
});
