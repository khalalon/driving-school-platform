import { Pool } from 'pg';
import { fakePool, UUID } from '../../../../test-utils/http';
import { ExamResult, ExamStatus, ExamType } from '../../types/exam.types';
import { ExamRepository } from '../exam.repository';

describe('ExamRepository (schéma 008, objet Exam du contrat)', () => {
  const preferredDate = new Date('2026-10-15T09:00:00Z');
  const row = { id: UUID.booking, status: 'pending', studentCompletedLessons: 3 };

  it('createRequest : INSERT pending (sans date ni instructeur), relecture jointe users + stats', async () => {
    const query = jest
      .fn()
      .mockResolvedValueOnce({ rows: [{ id: UUID.booking }] })
      .mockResolvedValueOnce({ rows: [row] });
    const repo = new ExamRepository({ query } as unknown as Pool);

    const created = await repo.createRequest({
      studentRowId: UUID.student,
      schoolId: UUID.school,
      examType: ExamType.THEORY,
      preferredDate,
      message: 'Je suis prêt',
    });

    expect(created).toEqual(row);
    const [insertSql, params] = query.mock.calls[0] as [string, unknown[]];
    expect(insertSql).toMatch(
      /INSERT INTO exams \(school_id, student_id, type, status, preferred_date, message/
    );
    expect(insertSql).toMatch(/'pending'/);
    expect(params).toEqual([UUID.school, UUID.student, 'theory', preferredDate, 'Je suis prêt']);
    const [selectSql] = query.mock.calls[1] as [string, unknown[]];
    expect(selectSql).toMatch(/u\.id AS "studentId"/);
    expect(selectSql).toMatch(/LEFT JOIN student_lesson_stats sls/);
    expect(selectSql).toMatch(/AS "studentCompletedLessons"/);
    expect(selectSql).toMatch(/WHERE e\.id = \$1/);
  });

  it('createRequest : message absent → null ; erreur si relecture vide', async () => {
    const query = jest
      .fn()
      .mockResolvedValueOnce({ rows: [{ id: UUID.booking }] })
      .mockResolvedValueOnce({ rows: [] });
    const repo = new ExamRepository({ query } as unknown as Pool);

    await expect(
      repo.createRequest({
        studentRowId: UUID.student,
        schoolId: UUID.school,
        examType: ExamType.PRACTICAL,
        preferredDate,
      })
    ).rejects.toThrow(/introuvable après écriture/);
    expect((query.mock.calls[0] as [string, unknown[]])[1][4]).toBeNull();
  });

  it('findAll : portée élève, école ou tout ; statuts multiples (ANY) ; tri par date', async () => {
    const { pool, query } = fakePool([]);
    const repo = new ExamRepository(pool);

    await repo.findAll(
      { kind: 'student', studentRowId: UUID.student },
      { status: [ExamStatus.PENDING, ExamStatus.SCHEDULED] }
    );
    await repo.findAll({ kind: 'school', schoolId: UUID.school }, {});
    await repo.findAll({ kind: 'all' }, { status: [] });

    const [studentSql, studentParams] = query.mock.calls[0] as [string, unknown[]];
    const [schoolSql, schoolParams] = query.mock.calls[1] as [string, unknown[]];
    const [allSql, allParams] = query.mock.calls[2] as [string, unknown[]];
    expect(studentSql).toMatch(/WHERE e\.student_id = \$1 AND e\.status = ANY\(\$2\)/);
    expect(studentSql).toMatch(/ORDER BY COALESCE\(e\.date_time, e\.preferred_date\) ASC/);
    expect(studentParams).toEqual([UUID.student, ['pending', 'scheduled']]);
    expect(schoolSql).toMatch(/WHERE e\.school_id = \$1\s+ORDER BY/);
    expect(schoolParams).toEqual([UUID.school]);
    expect(allSql).not.toMatch(/WHERE/);
    expect(allParams).toEqual([]);
  });

  it('schedule / reject / recordResult : UPDATE conditionné au statut, relecture ; null si aucune ligne', async () => {
    const query = jest
      .fn()
      .mockResolvedValueOnce({ rows: [{ id: UUID.booking }] })
      .mockResolvedValueOnce({ rows: [{ ...row, status: 'scheduled' }] })
      .mockResolvedValueOnce({ rows: [] }) // reject : plus pending
      .mockResolvedValueOnce({ rows: [{ id: UUID.booking }] })
      .mockResolvedValueOnce({ rows: [{ ...row, status: 'completed', result: 'passed' }] });
    const repo = new ExamRepository({ query } as unknown as Pool);
    const dateTime = new Date('2026-10-20T09:00:00Z');

    await expect(
      repo.schedule(UUID.booking, { dateTime, location: 'Centre ATTT' })
    ).resolves.toMatchObject({ status: 'scheduled' });
    const [scheduleSql, scheduleParams] = query.mock.calls[0] as [string, unknown[]];
    expect(scheduleSql).toMatch(/SET status = 'scheduled', date_time = \$2, location = \$3/);
    expect(scheduleSql).toMatch(/WHERE id = \$1 AND status = 'pending'/);
    expect(scheduleParams).toEqual([UUID.booking, dateTime, 'Centre ATTT']);

    await expect(repo.reject(UUID.booking, 'Dossier incomplet')).resolves.toBeNull();
    const [rejectSql] = query.mock.calls[2] as [string, unknown[]];
    expect(rejectSql).toMatch(/SET status = 'rejected', rejection_reason = \$2/);

    await expect(
      repo.recordResult(UUID.booking, { result: ExamResult.PASSED })
    ).resolves.toMatchObject({ status: 'completed' });
    const [resultSql, resultParams] = query.mock.calls[3] as [string, unknown[]];
    expect(resultSql).toMatch(/SET status = 'completed', result = \$2, score = \$3, notes = \$4/);
    expect(resultSql).toMatch(/WHERE id = \$1 AND status = 'scheduled'/);
    expect(resultParams).toEqual([UUID.booking, 'passed', null, null]);
  });

  it('findById : null sans ligne', async () => {
    await expect(new ExamRepository(fakePool([]).pool).findById(UUID.booking)).resolves.toBeNull();
  });
});
