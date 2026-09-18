import { LessonType } from '../../../../types/domain';
import { fakePool, UUID } from '../../../../test-utils/http';
import { LessonStatus } from '../../types/lesson.types';
import { BookingRepository } from '../booking.repository';
import { LessonRepository } from '../lesson.repository';

describe('LessonRepository', () => {
  const dateTime = new Date('2026-10-01T10:00:00Z');

  it('create : leçon scheduled pour un élève, colonnes 007 renvoyées (deux dates, paiement)', async () => {
    const { pool, query } = fakePool([{ id: UUID.booking }]);
    await new LessonRepository(pool).create({
      schoolId: UUID.school,
      studentId: UUID.student,
      instructorId: UUID.instructor,
      type: LessonType.CODE,
      scheduledDate: dateTime,
      durationMinutes: 60,
      price: 20,
    });
    const [sql, params] = query.mock.calls[0] as [string, unknown[]];
    expect(sql).toMatch(
      /INSERT INTO lessons \(school_id, student_id, instructor_id, type, scheduled_date/
    );
    expect(sql).toMatch(/\$7, 'scheduled'/);
    expect(sql).toMatch(/requested_date AS "requestedDate", scheduled_date AS "scheduledDate"/);
    expect(sql).toMatch(/paid, amount::float8 AS amount/);
    expect(params).toEqual([UUID.school, UUID.student, UUID.instructor, 'CODE', dateTime, 60, 20]);
  });

  it('findAll : WHERE à partir des filtres présents ; status multiple (ANY), studentId, date du jour', async () => {
    const { pool, query } = fakePool([]);
    const repo = new LessonRepository(pool);

    await repo.findAll({});
    await repo.findAll({
      schoolId: UUID.school,
      status: [LessonStatus.PENDING, LessonStatus.SCHEDULED],
      dateFrom: dateTime,
      studentId: UUID.student,
    });
    await repo.findAll({ status: [], date: '2026-10-01' });

    const [sqlNone, paramsNone] = query.mock.calls[0] as [string, unknown[]];
    const [sqlSome, paramsSome] = query.mock.calls[1] as [string, unknown[]];
    const [sqlDay, paramsDay] = query.mock.calls[2] as [string, unknown[]];
    expect(sqlNone).not.toMatch(/WHERE/);
    expect(sqlNone).toMatch(/ORDER BY COALESCE\(scheduled_date, requested_date\) ASC/);
    expect(paramsNone).toEqual([]);
    expect(sqlSome).toMatch(
      /WHERE school_id = \$1 AND student_id = \$2 AND status = ANY\(\$3\) AND scheduled_date >= \$4/
    );
    expect(paramsSome).toEqual([UUID.school, UUID.student, ['pending', 'scheduled'], dateTime]);
    expect(sqlDay).toMatch(
      /WHERE COALESCE\(scheduled_date, CASE WHEN status = 'pending' THEN requested_date END\)::date = \$1::date/
    );
    expect(paramsDay).toEqual(['2026-10-01']);
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
    expect((query.mock.calls[2] as [string])[0]).toMatch(
      /LEAST\(current_bookings \+ 1, capacity\)/
    );
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
      status: [LessonStatus.COMPLETED],
      dateFrom,
      dateTo,
    });
    const [sqlAll, paramsAll] = query.mock.calls[0] as [string, unknown[]];
    expect(sqlAll).toMatch(
      /WHERE school_id = \$1 AND instructor_id = \$2 AND type = \$3 AND status = ANY\(\$4\) AND scheduled_date >= \$5 AND scheduled_date <= \$6/
    );
    expect(paramsAll).toHaveLength(6);

    await repo.update(UUID.booking, {
      instructorId: UUID.instructor,
      scheduledDate: dateFrom,
      durationMinutes: 90,
      price: 55,
      status: LessonStatus.SCHEDULED,
    });
    const [sqlUpd, paramsUpd] = query.mock.calls[1] as [string, unknown[]];
    expect(sqlUpd).toMatch(
      /SET instructor_id = \$1, scheduled_date = \$2, duration_minutes = \$3, price = \$4, status = \$5, updated_at = CURRENT_TIMESTAMP WHERE id = \$6/
    );
    expect(paramsUpd).toEqual([UUID.instructor, dateFrom, 90, 55, 'scheduled', UUID.booking]);
  });
});
