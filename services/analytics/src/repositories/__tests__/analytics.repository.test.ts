import { AnalyticsRepository } from '../analytics.repository';
import { IDatabase } from '../../config/database';
import { AnalyticsQuery } from '../../types';

describe('AnalyticsRepository', () => {
  let repository: AnalyticsRepository;
  let mockDb: jest.Mocked<IDatabase>;

  beforeEach(() => {
    mockDb = {
      query: jest.fn(),
    };

    repository = new AnalyticsRepository(mockDb);
  });

  describe('getRevenueReport', () => {
    it('should calculate total revenue correctly', async () => {
      const query: AnalyticsQuery = {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-12-31'),
      };

      mockDb.query
        .mockResolvedValueOnce({ rows: [{ revenue: '7000' }] }) // lesson revenue
        .mockResolvedValueOnce({ rows: [{ revenue: '3000' }] }); // exam revenue

      const result = await repository.getRevenueReport(query);

      expect(result.totalRevenue).toBe(10000);
      expect(result.lessonRevenue).toBe(7000);
      expect(result.examRevenue).toBe(3000);
      expect(mockDb.query).toHaveBeenCalledTimes(2);
    });

    it('should handle school filter', async () => {
      const query: AnalyticsQuery = {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-12-31'),
        schoolId: 'school-123',
      };

      mockDb.query
        .mockResolvedValueOnce({ rows: [{ revenue: '5000' }] })
        .mockResolvedValueOnce({ rows: [{ revenue: '2000' }] });

      const result = await repository.getRevenueReport(query);

      expect(result.schoolId).toBe('school-123');
      expect(result.totalRevenue).toBe(7000);
    });
  });

  describe('getLessonStats', () => {
    it('should aggregate lesson statistics', async () => {
      const query: AnalyticsQuery = {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-12-31'),
      };

      mockDb.query
        .mockResolvedValueOnce({
          rows: [
            { total_lessons: '50', completed: '40', cancelled: '10', lesson_type: 'CODE' },
            { total_lessons: '30', completed: '25', cancelled: '5', lesson_type: 'Manœuvre' },
          ],
        })
        .mockResolvedValueOnce({ rows: [{ avg_attendance: '85' }] });

      const result = await repository.getLessonStats(query);

      expect(result.totalLessons).toBe(80);
      expect(result.completedLessons).toBe(65);
      expect(result.cancelledLessons).toBe(15);
      expect(result.popularLessonType).toBe('CODE');
    });
  });
});
