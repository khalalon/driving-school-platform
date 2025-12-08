import { IBookingRepository } from '../repositories/booking.repository';
import { ILessonRepository } from '../repositories/lesson.repository';
import { IStudentRepository } from '../repositories/student.repository';
import { LessonBooking, MarkAttendanceDTO, LessonStatus } from '../types';

export class BookingService {
  constructor(
    private readonly bookingRepository: IBookingRepository,
    private readonly lessonRepository: ILessonRepository,
    private readonly studentRepository: IStudentRepository
  ) {}

  async bookLesson(lessonId: string, studentId: string): Promise<LessonBooking> {
    const lesson = await this.lessonRepository.findById(lessonId);
    if (!lesson) {
      throw new Error('Lesson not found');
    }

    const student = await this.studentRepository.findById(studentId);
    if (!student) {
      throw new Error('Student not found');
    }

    if (!student.authorized) {
      throw new Error('Student is not authorized to book lessons');
    }

    if (lesson.status !== LessonStatus.SCHEDULED) {
      throw new Error('Lesson is not available for booking');
    }

    if (lesson.currentBookings >= lesson.capacity) {
      throw new Error('Lesson is full');
    }

    const existingBooking = await this.bookingRepository.findByLessonAndStudent(
      lessonId,
      studentId
    );
    if (existingBooking) {
      throw new Error('Student already booked this lesson');
    }

    const booking = await this.bookingRepository.create(lessonId, studentId);
    await this.lessonRepository.incrementBookings(lessonId);

    return booking;
  }

  async getBookingById(id: string): Promise<LessonBooking> {
    const booking = await this.bookingRepository.findById(id);
    if (!booking) {
      throw new Error('Booking not found');
    }
    return booking;
  }

  async getBookingsByLesson(lessonId: string): Promise<LessonBooking[]> {
    return this.bookingRepository.findByLessonId(lessonId);
  }

  async getBookingsByStudent(studentId: string): Promise<LessonBooking[]> {
    return this.bookingRepository.findByStudentId(studentId);
  }

  async markAttendance(bookingId: string, dto: MarkAttendanceDTO): Promise<LessonBooking> {
    const booking = await this.bookingRepository.findById(bookingId);
    if (!booking) {
      throw new Error('Booking not found');
    }

    if (dto.rating && (dto.rating < 1 || dto.rating > 5)) {
      throw new Error('Rating must be between 1 and 5');
    }

    return this.bookingRepository.updateAttendance(bookingId, dto);
  }

  async cancelBooking(bookingId: string): Promise<void> {
    const booking = await this.bookingRepository.findById(bookingId);
    if (!booking) {
      throw new Error('Booking not found');
    }

    if (booking.attended !== null) {
      throw new Error('Cannot cancel booking with marked attendance');
    }

    await this.bookingRepository.delete(bookingId);
    await this.lessonRepository.decrementBookings(booking.lessonId);
  }
}
