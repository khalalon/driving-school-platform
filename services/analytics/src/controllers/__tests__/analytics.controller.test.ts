import { Request, Response } from 'express';
import { AnalyticsController } from '../analytics.controller';
import { IAnalyticsService } from '../../services/analytics.service';

describe('AnalyticsController', () => {
  let controller: AnalyticsController;
  let mockService: jest.Mocked<IAnalyticsService>;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;

  beforeEach(() => {
    mockService = {
      getRevenueReport: jest.fn(),
      getLessonStats: jest.fn(),
      getExamStats: jest.fn(),
      getStudentEngagement: jest.fn(),
      getInstructorPerformance: jest.fn(),
    };

    controller = new AnalyticsController(mockService);

    mockRequest = {
      query: {
        startDate: '2024-01-01',
        endDate: '2024-12-31',
      },
    };

    mockResponse = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis(),
    };
  });

  describe('getRevenueReport', () => {
    it('should return revenue report', async () => {
      const report = {
        totalRevenue: 10000,
        lessonRevenue: 7000,
        examRevenue: 3000,
        periodStart: new Date('2024-01-01'),
        periodEnd: new Date('2024-12-31'),
      };

      mockService.getRevenueReport.mockResolvedValue(report);

      await controller.getRevenueReport(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith(report);
      expect(mockService.getRevenueReport).toHaveBeenCalled();
    });

    it('should return 400 for invalid query', async () => {
      mockRequest.query = { startDate: 'invalid-date' };

      await controller.getRevenueReport(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });

    it('should handle errors', async () => {
      mockService.getRevenueReport.mockRejectedValue(new Error('Database error'));

      await controller.getRevenueReport(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
    });
  });
});
