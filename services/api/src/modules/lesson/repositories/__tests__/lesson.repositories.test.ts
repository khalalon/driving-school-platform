import { LessonType } from '../../../../types/domain';
import { fakePool, UUID } from '../../../../test-utils/http';
import { LessonStatus } from '../../types/lesson.types';
import { BookingRepository } from '../booking.repository';
import { LessonRepository } from '../lesson.repository';

describe('LessonRepository', () => {
  const dateTime = new Date('2026-10-01T10:00:00Z');

  it('create : paramètres dans l’ordre du SQL, statut scheduled, 0 réservation', async () => {
    const { pool, query } = fakePool([{ id: UUID.booking }]);
    await new LessonRepository(pool).create({
      schoolId: UUID.school,
      instructorId: UUID.instructor,
      type: LessonType.CODE,
      dateTime,
      durationMinutes: 60,
      capacity: 1,
      price: 20,
    });
    const [sql, params] = query.mock.calls[0] as [string, unknown[]];
    expect(sql).toMatch(/0, \$7, 'scheduled'/);
    expect(params).toEqual([UUID.school, UUID.instructor, 'CODE', dateTime, 60, 1, 20]);
  });

  it('findAll : construit le WHERE à partir des filtres présents, ignore studentId', async () => {
    const { pool, query } = fakePool([]);
    const repo = new LessonRepository(pool);

    await repo.findAll({});
    await repo.findAll({
      schoolId: UUID.school,
      status: LessonStatus.SCHEDULED,
      dateFrom: dateTime,
      studentId: UUID.student,
    });

    const [sqlNone, paramsNone] = query.mock.calls[0] as [string, unknown[]];
    const [sqlSome, paramsSome] = query.mock.calls[1] as [string, unknown[]];
    expect(sqlNone).not.toMatch(/WHERE/);
    expect(paramsNone).toEqual([]);
    expect(sqlSome).toMatch(/WHERE school_id = \$1 AND status = \$2 AND date_time >= \$3/);
    expect(paramsSome).toEqual([UUID.school, 'scheduled', dateTime]);
  });

  it('update : SET dynamique, identifiant en dernier paramètre', async () => {
    const { pool, query } = fakePool([{ id: UUID.booking }]);
    await new LessonRepository(pool).update(UUID.booking, {
      price: 45,
      status: LessonStatus.CANCELLED,
    });
    const [sql, params] = query.mock.calls[0] as [string, unknown[]];
    expect(sql).toMatch(
      /SET price = \$1, status = \$2, updated_at = CURRENT_TIMESTAMP WHERE id = \$3/
    );
    expect(params).toEqual([45, 'cancelled', UUID.booking]);
  });

  it('findById null, delete, increment / decrement', async () => {
    const { pool, query } = fakePool([]);
    const repo = new LessonRepository(pool);
    await expect(repo.findById(UUID.booking)).resolves.toBeNull();
    await repo.delete(UUID.booking);
    await repo.incrementBookings(UUID.booking);
    await repo.decrementBookings(UUID.booking);
    expect((query.mock.calls[2] as [string])[0]).toMatch(/current_bookings \+ 1/);
    expect((query.mock.calls[3] as [string])[0]).toMatch(/GREATEST\(current_bookings - 1, 0\)/);
  });
});

describe('BookingRepository', () => {
  it('create / lectures / delete', async () => {
    const row = { id: UUID.request, lessonId: UUID.booking, studentId: UUID.student };
    const { pool, query } = fakePool([row]);
    const repo = new BookingRepository(pool);

    await expect(repo.create(UUID.booking, UUID.student)).resolves.toEqual(row);
    expect((query.mock.calls[0] as [string, unknown[]])[1]).toEqual([UUID.booking, UUID.student]);
    await expect(repo.findById(UUID.request)).resolves.toEqual(row);
    await expect(repo.findByLessonId(UUID.booking)).resolves.toEqual([row]);
    await expect(repo.findByStudentId(UUID.student)).resolves.toEqual([row]);
    await expect(repo.findByLessonAndStudent(UUID.booking, UUID.student)).resolves.toEqual(row);
    await repo.delete(UUID.request);
    await expect(new BookingRepository(fakePool([]).pool).findById('x')).resolves.toBeNull();
  });

  it('updateAttendance : feedback et rating facultatifs, identifiant en dernier', async () => {
    const { pool, query } = fakePool([{ id: UUID.request }]);
    const repo = new BookingRepository(pool);

    await repo.updateAttendance(UUID.request, { attended: true });
    await repo.updateAttendance(UUID.request, { attended: false, feedback: 'Absent', rating: 1 });

    expect((query.mock.calls[0] as [string, unknown[]])[1]).toEqual([true, UUID.request]);
    const [sql, params] = query.mock.calls[1] as [string, unknown[]];
    expect(sql).toMatch(/SET attended = \$1, feedback = \$2, rating = \$3 WHERE id = \$4/);
    expect(params).toEqual([false, 'Absent', 1, UUID.request]);
  });
});

describe('LessonRepository — toutes les branches des constructeurs SQL', () => {
  it('findAll avec tous les filtres ; update avec tous les champs', async () => {
    const dateFrom = new Date('2026-10-01T00:00:00Z');
    const dateTo = new Date('2026-10-31T00:00:00Z');
    const { pool, query } = fakePool([{ id: UUID.booking }]);
    const repo = new LessonRepository(pool);

    await repo.findAll({
      schoolId: UUID.school,
      instructorId: UUID.instructor,
      type: LessonType.PARC,
      status: LessonStatus.COMPLETED,
      dateFrom,
      dateTo,
    });
    const [sqlAll, paramsAll] = query.mock.calls[0] as [string, unknown[]];
    expect(sqlAll).toMatch(
      /WHERE school_id = \$1 AND instructor_id = \$2 AND type = \$3 AND status = \$4 AND date_time >= \$5 AND date_time <= \$6/
    );
    expect(paramsAll).toHaveLength(6);

    await repo.update(UUID.booking, {
      instructorId: UUID.instructor,
      dateTime: dateFrom,
      durationMinutes: 90,
      capacity: 2,
      price: 55,
      status: LessonStatus.SCHEDULED,
    });
    const [sqlUpd, paramsUpd] = query.mock.calls[1] as [string, unknown[]];
    expect(sqlUpd).toMatch(
      /SET instructor_id = \$1, date_time = \$2, duration_minutes = \$3, capacity = \$4, price = \$5, status = \$6, updated_at = CURRENT_TIMESTAMP WHERE id = \$7/
    );
    expect(paramsUpd).toEqual([UUID.instructor, dateFrom, 90, 2, 55, 'scheduled', UUID.booking]);
  });
});
