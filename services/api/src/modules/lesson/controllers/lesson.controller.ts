import { Request, Response } from 'express';
import { sendCaughtError, sendValidationError } from '../../../http/errors';
import { uuidParam, validate } from '../../../http/validation';
import { BookingService } from '../services/booking.service';
import { LessonService } from '../services/lesson.service';
import {
  bookLessonSchema,
  createLessonSchema,
  lessonFiltersSchema,
  markAttendanceSchema,
  updateLessonSchema,
} from '../validators/lesson.validator';

export class LessonController {
  constructor(
    private readonly lessonService: LessonService,
    private readonly bookingService: BookingService
  ) {}

  // --- Créneaux ---

  createLesson = async (req: Request, res: Response): Promise<void> => {
    const parsed = validate(createLessonSchema, req.body);
    if (!parsed.ok) {
      sendValidationError(res, parsed.detail);
      return;
    }
    try {
      res.status(201).json(await this.lessonService.createLesson(parsed.value));
    } catch (err) {
      sendCaughtError(res, err);
    }
  };

  getLessons = async (req: Request, res: Response): Promise<void> => {
    const parsed = validate(lessonFiltersSchema, req.query);
    if (!parsed.ok) {
      sendValidationError(res, parsed.detail);
      return;
    }
    try {
      res.json(await this.lessonService.getLessons(parsed.value));
    } catch (err) {
      sendCaughtError(res, err);
    }
  };

  getLesson = async (req: Request, res: Response): Promise<void> => {
    try {
      res.json(await this.lessonService.getLessonById(uuidParam(req.params.id, 'Leçon')));
    } catch (err) {
      sendCaughtError(res, err);
    }
  };

  checkAvailability = async (req: Request, res: Response): Promise<void> => {
    try {
      const available = await this.lessonService.checkAvailability(
        uuidParam(req.params.id, 'Leçon')
      );
      res.json({ available });
    } catch (err) {
      sendCaughtError(res, err);
    }
  };

  updateLesson = async (req: Request, res: Response): Promise<void> => {
    const parsed = validate(updateLessonSchema, req.body);
    if (!parsed.ok) {
      sendValidationError(res, parsed.detail);
      return;
    }
    try {
      const id = uuidParam(req.params.id, 'Leçon');
      res.json(await this.lessonService.updateLesson(id, parsed.value));
    } catch (err) {
      sendCaughtError(res, err);
    }
  };

  cancelLesson = async (req: Request, res: Response): Promise<void> => {
    try {
      res.json(await this.lessonService.cancelLesson(uuidParam(req.params.id, 'Leçon')));
    } catch (err) {
      sendCaughtError(res, err);
    }
  };

  deleteLesson = async (req: Request, res: Response): Promise<void> => {
    try {
      await this.lessonService.deleteLesson(uuidParam(req.params.id, 'Leçon'));
      res.status(204).send();
    } catch (err) {
      sendCaughtError(res, err);
    }
  };

  // --- Réservations ---

  bookLesson = async (req: Request, res: Response): Promise<void> => {
    const parsed = validate(bookLessonSchema, req.body);
    if (!parsed.ok) {
      sendValidationError(res, parsed.detail);
      return;
    }
    try {
      const lessonId = uuidParam(req.params.lessonId, 'Leçon');
      res.status(201).json(await this.bookingService.bookLesson(lessonId, parsed.value.studentId));
    } catch (err) {
      sendCaughtError(res, err);
    }
  };

  getBooking = async (req: Request, res: Response): Promise<void> => {
    try {
      res.json(await this.bookingService.getBookingById(uuidParam(req.params.id, 'Réservation')));
    } catch (err) {
      sendCaughtError(res, err);
    }
  };

  getBookingsByLesson = async (req: Request, res: Response): Promise<void> => {
    try {
      res.json(
        await this.bookingService.getBookingsByLesson(uuidParam(req.params.lessonId, 'Leçon'))
      );
    } catch (err) {
      sendCaughtError(res, err);
    }
  };

  getBookingsByStudent = async (req: Request, res: Response): Promise<void> => {
    try {
      res.json(
        await this.bookingService.getBookingsByStudent(uuidParam(req.params.studentId, 'Élève'))
      );
    } catch (err) {
      sendCaughtError(res, err);
    }
  };

  markAttendance = async (req: Request, res: Response): Promise<void> => {
    const parsed = validate(markAttendanceSchema, req.body);
    if (!parsed.ok) {
      sendValidationError(res, parsed.detail);
      return;
    }
    try {
      const bookingId = uuidParam(req.params.bookingId, 'Réservation');
      res.json(await this.bookingService.markAttendance(bookingId, parsed.value));
    } catch (err) {
      sendCaughtError(res, err);
    }
  };

  cancelBooking = async (req: Request, res: Response): Promise<void> => {
    try {
      await this.bookingService.cancelBooking(uuidParam(req.params.bookingId, 'Réservation'));
      res.status(204).send();
    } catch (err) {
      sendCaughtError(res, err);
    }
  };
}
