import { Pool } from 'pg';
import { LessonType } from '../../../../types/domain';
import { fakePool, UUID } from '../../../../test-utils/http';
import { LessonStatus } from '../../types/lesson.types';
import { LessonRepository, SCHOOL_TIMEZONE } from '../lesson.repository';

describe('LessonRepository (schéma 007, objet Lesson du contrat)', () => {
  const requestedDate = new Date('2026-10-01T10:00:00Z');
  const row = { id: UUID.booking, status: 'pending', instructorId: null };

  it('createRequest : INSERT pending sans instructeur (D-32), puis relecture jointe', async () => {
    const query = jest
      .fn()
      .mockResolvedValueOnce({ rows: [{ id: UUID.booking }] })
      .mockResolvedValueOnce({ rows: [row] });
    const repo = new LessonRepository({ query } as unknown as Pool);

    const created = await repo.createRequest({
      studentRowId: UUID.student,
      schoolId: UUID.school,
      type: LessonType.PARC,
      requestedDate,
      preferredInstructorId: UUID.instructor,
      notes: 'Première leçon',
    });

    expect(created).toEqual(row);
    const [insertSql, params] = query.mock.calls[0] as [string, unknown[]];
    expect(insertSql).toMatch(
      /INSERT INTO lessons \(school_id, student_id, type, status, requested_date/
    );
    expect(insertSql).toMatch(/'pending'/);
    expect(params).toEqual([
      UUID.school,
      UUID.student,
      'Parc',
      requestedDate,
      UUID.instructor,
      'Première leçon',
    ]);
    const [selectSql] = query.mock.calls[1] as [string, unknown[]];
    expect(selectSql).toMatch(/su\.id AS "studentId"/);
    expect(selectSql).toMatch(/json_build_object\('id', su\.id, 'firstName', su\.first_name/);
    expect(selectSql).toMatch(/LEFT JOIN instructors i ON i\.id = l\.instructor_id/);
    expect(selectSql).toMatch(/WHERE l\.id = \$1/);
  });

  it('createRequest : préférence et notes absentes → null ; erreur si relecture vide', async () => {
    const query = jest
      .fn()
      .mockResolvedValueOnce({ rows: [{ id: UUID.booking }] })
      .mockResolvedValueOnce({ rows: [] });
    const repo = new LessonRepository({ query } as unknown as Pool);

    await expect(
      repo.createRequest({
        studentRowId: UUID.student,
        schoolId: UUID.school,
        type: LessonType.CODE,
        requestedDate,
      })
    ).rejects.toThrow(/introuvable après écriture/);
    const [, params] = query.mock.calls[0] as [string, unknown[]];
    expect(params.slice(4)).toEqual([null, null]);
  });

  it('findAll : portée élève, statuts multiples (ANY), jour local de l’école', async () => {
    const { pool, query } = fakePool([]);
    const repo = new LessonRepository(pool);

    await repo.findAll(
      { kind: 'student', studentRowId: UUID.student },
      { status: [LessonStatus.PENDING, LessonStatus.SCHEDULED], date: '2026-10-01' }
    );

    const [sql, params] = query.mock.calls[0] as [string, unknown[]];
    expect(sql).toMatch(/WHERE l\.student_id = \$1 AND l\.status = ANY\(\$2\) AND/);
    expect(sql).toContain(`AT TIME ZONE 'UTC' AT TIME ZONE '${SCHOOL_TIMEZONE}')::date = $3::date`);
    expect(sql).toMatch(/ORDER BY COALESCE\(l\.scheduled_date, l\.requested_date\) ASC/);
    expect(params).toEqual([UUID.student, ['pending', 'scheduled'], '2026-10-01']);
  });

  it('findAll : portée instructeur — school (file pending), mine, ou les deux (D-32)', async () => {
    const { pool, query } = fakePool([]);
    const repo = new LessonRepository(pool);
    const base = {
      kind: 'instructor' as const,
      instructorId: UUID.instructor,
      schoolId: UUID.school,
    };

    await repo.findAll({ ...base, scope: 'school' }, {});
    await repo.findAll({ ...base, scope: 'mine' }, {});
    await repo.findAll({ ...base, scope: 'both' }, {});

    const [school] = query.mock.calls[0] as [string, unknown[]];
    const [mine] = query.mock.calls[1] as [string, unknown[]];
    const [both, bothParams] = query.mock.calls[2] as [string, unknown[]];
    expect(school).toMatch(/WHERE \(l\.school_id = \$1 AND l\.status = 'pending'\)\s+ORDER BY/);
    expect(mine).toMatch(/WHERE l\.instructor_id = \$1\s+ORDER BY/);
    expect(both).toMatch(
      /WHERE \(\(l\.school_id = \$1 AND l\.status = 'pending'\) OR l\.instructor_id = \$2\)/
    );
    expect(bothParams).toEqual([UUID.school, UUID.instructor]);
  });

  it('approve / reject / cancel : UPDATE conditionné au statut, relecture jointe ; null si aucune ligne', async () => {
    const query = jest
      .fn()
      .mockResolvedValueOnce({ rows: [{ id: UUID.booking }] })
      .mockResolvedValueOnce({ rows: [{ ...row, status: 'scheduled' }] })
      .mockResolvedValueOnce({ rows: [] }) // reject : plus pending
      .mockResolvedValueOnce({ rows: [{ id: UUID.booking }] })
      .mockResolvedValueOnce({ rows: [{ ...row, status: 'cancelled' }] });
    const repo = new LessonRepository({ query } as unknown as Pool);
    const scheduledDate = new Date('2026-10-02T09:00:00Z');

    await expect(
      repo.approve(UUID.booking, {
        instructorId: UUID.instructor,
        scheduledDate,
        durationMinutes: 60,
        price: 40,
        adminNotes: 'RDV au parc',
      })
    ).resolves.toMatchObject({ status: 'scheduled' });
    const [approveSql, approveParams] = query.mock.calls[0] as [string, unknown[]];
    expect(approveSql).toMatch(
      /SET status = 'scheduled', instructor_id = \$2, scheduled_date = \$3/
    );
    expect(approveSql).toMatch(/WHERE id = \$1 AND status = 'pending'/);
    expect(approveParams).toEqual([
      UUID.booking,
      UUID.instructor,
      scheduledDate,
      60,
      40,
      'RDV au parc',
    ]);

    await expect(repo.reject(UUID.booking, 'Créneau indisponible')).resolves.toBeNull();
    const [rejectSql, rejectParams] = query.mock.calls[2] as [string, unknown[]];
    expect(rejectSql).toMatch(/SET status = 'rejected', rejection_reason = \$2/);
    expect(rejectSql).toMatch(/WHERE id = \$1 AND status = 'pending'/);
    expect(rejectParams).toEqual([UUID.booking, 'Créneau indisponible']);

    await expect(repo.cancel(UUID.booking, 'user-1')).resolves.toMatchObject({
      status: 'cancelled',
    });
    const [cancelSql, cancelParams] = query.mock.calls[3] as [string, unknown[]];
    expect(cancelSql).toMatch(
      /SET status = 'cancelled', cancellation_reason = \$2, cancelled_by = \$3/
    );
    expect(cancelSql).toMatch(/WHERE id = \$1 AND status IN \('pending', 'scheduled'\)/);
    expect(cancelParams).toEqual([UUID.booking, null, 'user-1']);
  });

  it('createScheduled (L4) et markAttendance (L7) : INSERT scheduled ; UPDATE conditionné, students.id renvoyé', async () => {
    const query = jest
      .fn()
      .mockResolvedValueOnce({ rows: [{ id: UUID.booking }] })
      .mockResolvedValueOnce({ rows: [{ ...row, status: 'scheduled' }] })
      .mockResolvedValueOnce({ rows: [{ id: UUID.booking, studentRowId: UUID.student }] })
      .mockResolvedValueOnce({ rows: [{ ...row, status: 'completed', attended: true }] })
      .mockResolvedValueOnce({ rows: [] });
    const repo = new LessonRepository({ query } as unknown as Pool);
    const scheduledDate = new Date('2026-10-02T09:00:00Z');

    await expect(
      repo.createScheduled({
        schoolId: UUID.school,
        studentRowId: UUID.student,
        instructorId: UUID.instructor,
        type: LessonType.CODE,
        scheduledDate,
        durationMinutes: 60,
        price: 20,
      })
    ).resolves.toMatchObject({ status: 'scheduled' });
    const [insertSql, insertParams] = query.mock.calls[0] as [string, unknown[]];
    expect(insertSql).toMatch(
      /INSERT INTO lessons \(school_id, student_id, instructor_id, type, status, scheduled_date/
    );
    expect(insertSql).toMatch(/'scheduled'/);
    expect(insertParams).toEqual([
      UUID.school,
      UUID.student,
      UUID.instructor,
      'CODE',
      scheduledDate,
      60,
      20,
      null,
    ]);

    const txQuery = jest.fn().mockResolvedValue({ rows: [] });
    await expect(repo.markAttendance(UUID.booking, { attended: true, rating: 4 })).resolves.toEqual(
      {
        lesson: { ...row, status: 'completed', attended: true },
        studentRowId: UUID.student,
      }
    );
    const [updateSql, updateParams] = query.mock.calls[2] as [string, unknown[]];
    expect(updateSql).toMatch(
      /SET status = 'completed', attended = \$2, feedback = \$3, rating = \$4/
    );
    expect(updateSql).toMatch(/WHERE id = \$1 AND status = 'scheduled'/);
    expect(updateSql).toMatch(/RETURNING id, student_id AS "studentRowId"/);
    expect(updateParams).toEqual([UUID.booking, true, null, 4]);

    await expect(repo.markAttendance(UUID.booking, { attended: false })).resolves.toBeNull();
    await repo.markAttendance(UUID.booking, { attended: false }, { query: txQuery });
    expect(txQuery).toHaveBeenCalledTimes(1);
  });

  it('findAll : portée admin sans condition ; findById null sans ligne', async () => {
    const { pool, query } = fakePool([]);
    const repo = new LessonRepository(pool);

    await repo.findAll({ kind: 'all' }, { status: [] });
    const [sql, params] = query.mock.calls[0] as [string, unknown[]];
    expect(sql).not.toMatch(/WHERE/);
    expect(params).toEqual([]);

    await expect(repo.findById(UUID.booking)).resolves.toBeNull();
  });
});
