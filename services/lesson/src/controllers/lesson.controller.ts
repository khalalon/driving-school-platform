import { Request, Response } from 'express';
import { LessonService } from '../services/lesson.service';
import {
  createLessonSchema,
  updateLessonSchema,
  lessonFiltersSchema,
} from '../validators/lesson.validator';

export class LessonController {
  constructor(private readonly lessonService: LessonService) {}

  createLesson = async (req: Request, res: Response): Promise<void> => {
    try {
      const { error, value } = createLessonSchema.validate(req.body);
      if (error) {
        res.status(400).json({ error: error.details[0].message });
        return;
      }

      const lesson = await this.lessonService.createLesson(value);
      res.status(201).json(lesson);
    } catch (err) {
      const error = err as Error;
      res.status(400).json({ error: error.message });
    }
  };

  getLesson = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const lesson = await this.lessonService.getLessonById(id);
      res.status(200).json(lesson);
    } catch (err) {
      const error = err as Error;
      res.status(404).json({ error: error.message });
    }
  };

  getLessons = async (req: Request, res: Response): Promise<void> => {
    try {
      const { error, value } = lessonFiltersSchema.validate(req.query);
      if (error) {
        res.status(400).json({ error: error.details[0].message });
        return;
      }

      const lessons = await this.lessonService.getLessons(value);
      res.status(200).json(lessons);
    } catch (err) {
      const error = err as Error;
      res.status(400).json({ error: error.message });
    }
  };

  updateLesson = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { error, value } = updateLessonSchema.validate(req.body);
      if (error) {
        res.status(400).json({ error: error.details[0].message });
        return;
      }

      const lesson = await this.lessonService.updateLesson(id, value);
      res.status(200).json(lesson);
    } catch (err) {
      const error = err as Error;
      res.status(400).json({ error: error.message });
    }
  };

  cancelLesson = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const lesson = await this.lessonService.cancelLesson(id);
      res.status(200).json(lesson);
    } catch (err) {
      const error = err as Error;
      res.status(400).json({ error: error.message });
    }
  };

  deleteLesson = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      await this.lessonService.deleteLesson(id);
      res.status(200).json({ message: 'Lesson deleted successfully' });
    } catch (err) {
      const error = err as Error;
      res.status(400).json({ error: error.message });
    }
  };

  checkAvailability = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const available = await this.lessonService.checkAvailability(id);
      res.status(200).json({ available });
    } catch (err) {
      const error = err as Error;
      res.status(400).json({ error: error.message });
    }
  };
}
