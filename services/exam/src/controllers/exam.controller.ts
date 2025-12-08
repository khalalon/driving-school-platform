import { Request, Response } from 'express';
import { ExamService } from '../services/exam.service';
import {
  createExamSchema,
  updateExamSchema,
  examFiltersSchema,
} from '../validators/exam.validator';

export class ExamController {
  constructor(private readonly examService: ExamService) {}

  createExam = async (req: Request, res: Response): Promise<void> => {
    try {
      const { error, value } = createExamSchema.validate(req.body);
      if (error) {
        res.status(400).json({ error: error.details[0].message });
        return;
      }

      const exam = await this.examService.createExam(value);
      res.status(201).json(exam);
    } catch (err) {
      const error = err as Error;
      res.status(400).json({ error: error.message });
    }
  };

  getExam = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const exam = await this.examService.getExamById(id);
      res.status(200).json(exam);
    } catch (err) {
      const error = err as Error;
      res.status(404).json({ error: error.message });
    }
  };

  getExams = async (req: Request, res: Response): Promise<void> => {
    try {
      const { error, value } = examFiltersSchema.validate(req.query);
      if (error) {
        res.status(400).json({ error: error.details[0].message });
        return;
      }

      const exams = await this.examService.getExams(value);
      res.status(200).json(exams);
    } catch (err) {
      const error = err as Error;
      res.status(400).json({ error: error.message });
    }
  };

  updateExam = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { error, value } = updateExamSchema.validate(req.body);
      if (error) {
        res.status(400).json({ error: error.details[0].message });
        return;
      }

      const exam = await this.examService.updateExam(id, value);
      res.status(200).json(exam);
    } catch (err) {
      const error = err as Error;
      res.status(400).json({ error: error.message });
    }
  };

  deleteExam = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      await this.examService.deleteExam(id);
      res.status(200).json({ message: 'Exam deleted successfully' });
    } catch (err) {
      const error = err as Error;
      res.status(400).json({ error: error.message });
    }
  };

  checkAvailability = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const available = await this.examService.checkAvailability(id);
      res.status(200).json({ available });
    } catch (err) {
      const error = err as Error;
      res.status(400).json({ error: error.message });
    }
  };
}
