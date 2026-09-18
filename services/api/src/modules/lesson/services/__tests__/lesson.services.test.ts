import { LessonType } from '../../../../types/domain';
import { IBookingRepository } from '../../repositories/booking.repository';
import { ILessonRepository } from '../../repositories/lesson.repository';
import { Lesson, LessonBooking, LessonStatus } from '../../types/lesson.types';
import { BookingService, StudentLookup } from '../booking.service';
import { LessonService } from '../lesson.service';

const future = new Date(Date.now() + 7 * 24 * 3600 * 1000);
const past = new Date(Date.now() - 24 * 3600 * 1000);
const lesson: Lesson = {
  id: 'lesson-1',
  schoolId: 'school-1',
  instructorId: 'instr-1',
  type: LessonType.PARC,
  dateTime: future,
  durationMinutes: 60,
  capacity: 1,
  currentBookings: 0,
  price: 40,
  status: LessonStatus.SCHEDULED,
  createdAt: past,
  updatedAt: past,
};
const booking: LessonBooking = {
  id: 'booking-1',
  lessonId: 'lesson-1',
  studentId: 'student-1',
  attended: null,
  feedback: null,
  rating: null,
  createdAt: past,
};

function lessonRepositoryMock(): jest.Mocked<ILessonRepository> {
  return {
    create: jest.fn(),
    findById: jest.fn(),
    findAll: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    incrementBookings: jest.fn(),
    decrementBookings: jest.fn(),
  };
}

describe('LessonService (créneaux, état actuel)', () => {
  let repository: jest.Mocked<ILessonRepository>;
  let service: LessonService;

  beforeEach(() => {
    repository = lessonRepositoryMock();
    service = new LessonService(repository);
  });

  it('createLesson : refuse une date passée (400), crée sinon', async () => {
    await expect(
      service.createLesson({ ...lesson, dateTime: past, instructorId: 'instr-1' })
    ).rejects.toMatchObject({ status: 400, code: 'VALIDATION_ERROR' });

    repository.create.mockResolvedValue(lesson);
    await expect(
      service.createLesson({
        schoolId: 'school-1',
        instructorId: 'instr-1',
        type: LessonType.PARC,
        dateTime: future,
        durationMinutes: 60,
        capacity: 1,
        price: 40,
      })
    ).resolves.toEqual(lesson);
  });

  it('getLessonById : 404 « Leçon introuvable »', async () => {
    repository.findById.mockResolvedValue(null);
    await expect(service.getLessonById('ghost')).rejects.toMatchObject({
      status: 404,
      message: 'Leçon introuvable',
    });
  });

  it('updateLesson : seulement si scheduled ; date future exigée', async () => {
    repository.findById.mockResolvedValue({ ...lesson, status: LessonStatus.COMPLETED });
    await expect(service.updateLesson('lesson-1', { price: 50 })).rejects.toMatchObject({
      status: 409,
    });

    repository.findById.mockResolvedValue(lesson);
    await expect(service.updateLesson('lesson-1', { dateTime: past })).rejects.toMatchObject({
      status: 400,
    });

    repository.update.mockResolvedValue({ ...lesson, price: 50 });
    await expect(service.updateLesson('lesson-1', { price: 50 })).resolves.toMatchObject({
      price: 50,
    });
  });

  it('cancelLesson / deleteLesson : refusés (409) avec des réservations', async () => {
    repository.findById.mockResolvedValue({ ...lesson, currentBookings: 1 });
    await expect(service.cancelLesson('lesson-1')).rejects.toMatchObject({ status: 409 });
    await expect(service.deleteLesson('lesson-1')).rejects.toMatchObject({ status: 409 });

    repository.findById.mockResolvedValue(lesson);
    repository.update.mockResolvedValue({ ...lesson, status: LessonStatus.CANCELLED });
    await expect(service.cancelLesson('lesson-1')).resolves.toMatchObject({
      status: 'cancelled',
    });
    expect(repository.update).toHaveBeenCalledWith('lesson-1', { status: 'cancelled' });
    await service.deleteLesson('lesson-1');
    expect(repository.delete).toHaveBeenCalledWith('lesson-1');
  });

  it('checkAvailability : place libre et statut scheduled', async () => {
    repository.findById.mockResolvedValue(lesson);
    await expect(service.checkAvailability('lesson-1')).resolves.toBe(true);
    repository.findById.mockResolvedValue({ ...lesson, currentBookings: 1 });
    await expect(service.checkAvailability('lesson-1')).resolves.toBe(false);
  });

  it('getLessons délègue les filtres', async () => {
    repository.findAll.mockResolvedValue([lesson]);
    await expect(service.getLessons({ schoolId: 'school-1' })).resolves.toEqual([lesson]);
    expect(repository.findAll).toHaveBeenCalledWith({ schoolId: 'school-1' });
  });
});

describe('BookingService (réservations, état actuel)', () => {
  let bookings: jest.Mocked<IBookingRepository>;
  let lessons: jest.Mocked<ILessonRepository>;
  let students: jest.Mocked<StudentLookup>;
  let service: BookingService;

  beforeEach(() => {
    bookings = {
      create: jest.fn(),
      findById: jest.fn(),
      findByLessonId: jest.fn(),
      findByStudentId: jest.fn(),
      findByLessonAndStudent: jest.fn(),
      updateAttendance: jest.fn(),
      delete: jest.fn(),
    };
    lessons = lessonRepositoryMock();
    students = { findById: jest.fn() };
    service = new BookingService(bookings, lessons, students);
  });

  it('bookLesson : crée la réservation et incrémente le compteur', async () => {
    lessons.findById.mockResolvedValue(lesson);
    students.findById.mockResolvedValue({ id: 'student-1', authorized: true });
    bookings.findByLessonAndStudent.mockResolvedValue(null);
    bookings.create.mockResolvedValue(booking);

    await expect(service.bookLesson('lesson-1', 'student-1')).resolves.toEqual(booking);
    expect(lessons.incrementBookings).toHaveBeenCalledWith('lesson-1');
  });

  it('bookLesson : 404 leçon / élève, 403 NOT_ENROLLED, 409 complet ou doublon', async () => {
    lessons.findById.mockResolvedValue(null);
    await expect(service.bookLesson('ghost', 'student-1')).rejects.toMatchObject({ status: 404 });

    lessons.findById.mockResolvedValue(lesson);
    students.findById.mockResolvedValue(null);
    await expect(service.bookLesson('lesson-1', 'ghost')).rejects.toMatchObject({ status: 404 });

    students.findById.mockResolvedValue({ id: 'student-1', authorized: false });
    await expect(service.bookLesson('lesson-1', 'student-1')).rejects.toMatchObject({
      status: 403,
      code: 'NOT_ENROLLED',
    });

    students.findById.mockResolvedValue({ id: 'student-1', authorized: true });
    lessons.findById.mockResolvedValue({ ...lesson, currentBookings: 1 });
    await expect(service.bookLesson('lesson-1', 'student-1')).rejects.toMatchObject({
      status: 409,
      message: 'Cette leçon est complète',
    });

    lessons.findById.mockResolvedValue(lesson);
    bookings.findByLessonAndStudent.mockResolvedValue(booking);
    await expect(service.bookLesson('lesson-1', 'student-1')).rejects.toMatchObject({
      status: 409,
      message: 'Cet élève a déjà réservé cette leçon',
    });
    expect(bookings.create).not.toHaveBeenCalled();
  });

  it('markAttendance : 404 si inconnue, sinon met à jour', async () => {
    bookings.findById.mockResolvedValue(null);
    await expect(service.markAttendance('ghost', { attended: true })).rejects.toMatchObject({
      status: 404,
    });

    bookings.findById.mockResolvedValue(booking);
    bookings.updateAttendance.mockResolvedValue({ ...booking, attended: true, rating: 5 });
    await expect(
      service.markAttendance('booking-1', { attended: true, rating: 5 })
    ).resolves.toMatchObject({ attended: true, rating: 5 });
  });

  it('cancelBooking : refusée si pointée, sinon supprime et décrémente', async () => {
    bookings.findById.mockResolvedValue({ ...booking, attended: true });
    await expect(service.cancelBooking('booking-1')).rejects.toMatchObject({ status: 409 });

    bookings.findById.mockResolvedValue(booking);
    await service.cancelBooking('booking-1');
    expect(bookings.delete).toHaveBeenCalledWith('booking-1');
    expect(lessons.decrementBookings).toHaveBeenCalledWith('lesson-1');
  });

  it('lectures : par leçon, par élève, par identifiant', async () => {
    bookings.findByLessonId.mockResolvedValue([booking]);
    bookings.findByStudentId.mockResolvedValue([booking]);
    bookings.findById.mockResolvedValue(booking);
    await expect(service.getBookingsByLesson('lesson-1')).resolves.toEqual([booking]);
    await expect(service.getBookingsByStudent('student-1')).resolves.toEqual([booking]);
    await expect(service.getBookingById('booking-1')).resolves.toEqual(booking);
  });
});
