import { Request, Response } from 'express';
import { IAnalyticsService } from '../services/analytics.service';
import { validateAnalyticsQuery } from '../validators/analytics.validator';

export class AnalyticsController {
  constructor(private service: IAnalyticsService) {}

  getRevenueReport = async (req: Request, res: Response): Promise<void> => {
    try {
      const { error, value } = validateAnalyticsQuery(req.query);

      if (error) {
        res.status(400).json({ error: error.details[0].message });
        return;
      }

      const report = await this.service.getRevenueReport(value);
      res.json(report);
    } catch (error) {
      console.error('Get revenue report error:', error);
      res.status(500).json({ error: 'Failed to generate revenue report' });
    }
  };

  getLessonStats = async (req: Request, res: Response): Promise<void> => {
    try {
      const { error, value } = validateAnalyticsQuery(req.query);

      if (error) {
        res.status(400).json({ error: error.details[0].message });
        return;
      }

      const stats = await this.service.getLessonStats(value);
      res.json(stats);
    } catch (error) {
      console.error('Get lesson stats error:', error);
      res.status(500).json({ error: 'Failed to generate lesson statistics' });
    }
  };

  getExamStats = async (req: Request, res: Response): Promise<void> => {
    try {
      const { error, value } = validateAnalyticsQuery(req.query);

      if (error) {
        res.status(400).json({ error: error.details[0].message });
        return;
      }

      const stats = await this.service.getExamStats(value);
      res.json(stats);
    } catch (error) {
      console.error('Get exam stats error:', error);
      res.status(500).json({ error: 'Failed to generate exam statistics' });
    }
  };

  getStudentEngagement = async (req: Request, res: Response): Promise<void> => {
    try {
      const { error, value } = validateAnalyticsQuery(req.query);

      if (error) {
        res.status(400).json({ error: error.details[0].message });
        return;
      }

      const engagement = await this.service.getStudentEngagement(value);
      res.json(engagement);
    } catch (error) {
      console.error('Get student engagement error:', error);
      res.status(500).json({ error: 'Failed to generate student engagement report' });
    }
  };

  getInstructorPerformance = async (req: Request, res: Response): Promise<void> => {
    try {
      const { error, value } = validateAnalyticsQuery(req.query);

      if (error) {
        res.status(400).json({ error: error.details[0].message });
        return;
      }

      const performance = await this.service.getInstructorPerformance(value);
      res.json(performance);
    } catch (error) {
      console.error('Get instructor performance error:', error);
      res.status(500).json({ error: 'Failed to generate instructor performance report' });
    }
  };

  getDashboardSummary = async (req: Request, res: Response): Promise<void> => {
    try {
      const { error, value } = validateAnalyticsQuery(req.query);

      if (error) {
        res.status(400).json({ error: error.details[0].message });
        return;
      }

      // Fetch all data in parallel
      const [revenue, lessonStats, examStats] = await Promise.all([
        this.service.getRevenueReport(value),
        this.service.getLessonStats(value),
        this.service.getExamStats(value),
      ]);

      res.json({
        revenue,
        lessonStats,
        examStats,
      });
    } catch (error) {
      console.error('Get dashboard summary error:', error);
      res.status(500).json({ error: 'Failed to generate dashboard summary' });
    }
  };
}
