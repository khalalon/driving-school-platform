import { Request, Response } from 'express';
import { BookingService } from '../services/booking.service';
import { bookLessonSchema, markAttendanceSchema } from '../validators/lesson.validator';

export class BookingController {
  constructor(private readonly bookingService: BookingService) {}

  bookLesson = async (req: Request, res: Response): Promise<void> => {
    try {
      const { lessonId } = req.params;
      const { error, value } = bookLessonSchema.validate(req.body);
      if (error) {
        res.status(400).json({ error: error.details[0].message });
        return;
      }

      const booking = await this.bookingService.bookLesson(lessonId, value.studentId);
      res.status(201).json(booking);
    } catch (err) {
      const error = err as Error;
      res.status(400).json({ error: error.message });
    }
  };

  getBooking = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const booking = await this.bookingService.getBookingById(id);
      res.status(200).json(booking);
    } catch (err) {
      const error = err as Error;
      res.status(404).json({ error: error.message });
    }
  };

  getBookingsByLesson = async (req: Request, res: Response): Promise<void> => {
    try {
      const { lessonId } = req.params;
      const bookings = await this.bookingService.getBookingsByLesson(lessonId);
      res.status(200).json(bookings);
    } catch (err) {
      const error = err as Error;
      res.status(400).json({ error: error.message });
    }
  };

  getBookingsByStudent = async (req: Request, res: Response): Promise<void> => {
    try {
      const { studentId } = req.params;
      const bookings = await this.bookingService.getBookingsByStudent(studentId);
      res.status(200).json(bookings);
    } catch (err) {
      const error = err as Error;
      res.status(400).json({ error: error.message });
    }
  };

  markAttendance = async (req: Request, res: Response): Promise<void> => {
    try {
      const { bookingId } = req.params;
      const { error, value } = markAttendanceSchema.validate(req.body);
      if (error) {
        res.status(400).json({ error: error.details[0].message });
        return;
      }

      const booking = await this.bookingService.markAttendance(bookingId, value);
      res.status(200).json(booking);
    } catch (err) {
      const error = err as Error;
      res.status(400).json({ error: error.message });
    }
  };

  cancelBooking = async (req: Request, res: Response): Promise<void> => {
    try {
      const { bookingId } = req.params;
      await this.bookingService.cancelBooking(bookingId);
      res.status(200).json({ message: 'Booking cancelled successfully' });
    } catch (err) {
      const error = err as Error;
      res.status(400).json({ error: error.message });
    }
  };
}
