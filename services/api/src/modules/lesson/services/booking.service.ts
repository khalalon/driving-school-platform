import { HttpError } from '../../../http/errors';
import { IBookingRepository } from '../repositories/booking.repository';
import { ILessonRepository } from '../repositories/lesson.repository';
import { LessonBooking, LessonStatus, MarkAttendanceDTO } from '../types/lesson.types';

/** Ce que la réservation attend du module student : retrouver une ligne `students` par son id. */
export interface StudentLookup {
  findById(id: string): Promise<{ id: string; authorized: boolean } | null>;
}

/** Réservations d'un créneau (`lesson_bookings`, `studentId` = students.id). État actuel. */
export class BookingService {
  constructor(
    private readonly bookingRepository: IBookingRepository,
    private readonly lessonRepository: ILessonRepository,
    private readonly students: StudentLookup
  ) {}

  async bookLesson(lessonId: string, studentId: string): Promise<LessonBooking> {
    const lesson = await this.lessonRepository.findById(lessonId);
    if (!lesson) {
      throw new HttpError(404, 'NOT_FOUND', 'Leçon introuvable');
    }

    const student = await this.students.findById(studentId);
    if (!student) {
      throw new HttpError(404, 'NOT_FOUND', 'Élève introuvable');
    }
    if (!student.authorized) {
      throw new HttpError(403, 'NOT_ENROLLED', "L'élève n'est pas autorisé à réserver");
    }

    if (lesson.status !== LessonStatus.SCHEDULED) {
      throw new HttpError(409, 'CONFLICT', 'Cette leçon n’est plus ouverte à la réservation');
    }
    if (lesson.currentBookings >= lesson.capacity) {
      throw new HttpError(409, 'CONFLICT', 'Cette leçon est complète');
    }

    const existing = await this.bookingRepository.findByLessonAndStudent(lessonId, studentId);
    if (existing) {
      throw new HttpError(409, 'CONFLICT', 'Cet élève a déjà réservé cette leçon');
    }

    const booking = await this.bookingRepository.create(lessonId, studentId);
    await this.lessonRepository.incrementBookings(lessonId);
    return booking;
  }

  async getBookingById(id: string): Promise<LessonBooking> {
    const booking = await this.bookingRepository.findById(id);
    if (!booking) {
      throw new HttpError(404, 'NOT_FOUND', 'Réservation introuvable');
    }
    return booking;
  }

  getBookingsByLesson(lessonId: string): Promise<LessonBooking[]> {
    return this.bookingRepository.findByLessonId(lessonId);
  }

  getBookingsByStudent(studentId: string): Promise<LessonBooking[]> {
    return this.bookingRepository.findByStudentId(studentId);
  }

  /** Les bornes (`rating` 1–5) sont garanties par le validateur Joi. */
  async markAttendance(bookingId: string, dto: MarkAttendanceDTO): Promise<LessonBooking> {
    await this.getBookingById(bookingId);
    return this.bookingRepository.updateAttendance(bookingId, dto);
  }

  async cancelBooking(bookingId: string): Promise<void> {
    const booking = await this.getBookingById(bookingId);
    if (booking.attended !== null) {
      throw new HttpError(409, 'CONFLICT', 'Impossible d’annuler une réservation déjà pointée');
    }
    await this.bookingRepository.delete(bookingId);
    await this.lessonRepository.decrementBookings(booking.lessonId);
  }
}
