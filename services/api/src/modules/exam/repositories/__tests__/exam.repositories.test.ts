import { Pool } from 'pg';
import { fakePool, UUID } from '../../../../test-utils/http';
import { ExamStatus, ExamType } from '../../types/exam.types';
import { ExamRepository } from '../exam.repository';

describe('ExamRepository (schéma 008 : un examen = un élève)', () => {
  const dateTime = new Date('2026-10-15T09:00:00Z');
  const row = { id: UUID.booking, studentFirstName: 'Élève', studentCompletedLessons: 3 };

  it('create : INSERT scheduled avec l’élève, location / examinerId absents → null, relecture jointe', async () => {
    const query = jest
      .fn()
      .mockResolvedValueOnce({ rows: [{ id: UUID.booking }] })
      .mockResolvedValueOnce({ rows: [row] });
    const repo = new ExamRepository({ query } as unknown as Pool);

    const created = await repo.create({
      schoolId: UUID.school,
      studentId: UUID.student,
      type: ExamType.THEORY,
      dateTime,
      price: 60,
    });

    expect(created).toEqual(row);
    const [insertSql, params] = query.mock.calls[0] as [string, unknown[]];
    expect(insertSql).toMatch(
      /INSERT INTO exams \(school_id, student_id, type, date_time, location/
    );
    expect(insertSql).toMatch(/'scheduled'/);
    expect(params).toEqual([UUID.school, UUID.student, 'theory', dateTime, null, null, 60]);
    const [selectSql] = query.mock.calls[1] as [string, unknown[]];
    expect(selectSql).toMatch(/LEFT JOIN users u ON u\.id = s\.user_id/);
    expect(selectSql).toMatch(/LEFT JOIN student_lesson_stats sls/);
    expect(selectSql).toMatch(/AS "studentCompletedLessons"/);
    expect(selectSql).toMatch(/WHERE e\.id = \$1/);
  });

  it('create : erreur si la ligne écrite est introuvable à la relecture', async () => {
    const query = jest
      .fn()
      .mockResolvedValueOnce({ rows: [{ id: UUID.booking }] })
      .mockResolvedValueOnce({ rows: [] });
    const repo = new ExamRepository({ query } as unknown as Pool);

    await expect(
      repo.create({
        schoolId: UUID.school,
        studentId: UUID.student,
        type: ExamType.PRACTICAL,
        dateTime,
        price: 80,
      })
    ).rejects.toThrow(/introuvable après écriture/);
  });

  it('findAll : filtres facultatifs, status multiple (ANY), tri par date de session puis souhaitée', async () => {
    const { pool, query } = fakePool([]);
    const repo = new ExamRepository(pool);

    await repo.findAll({});
    await repo.findAll({
      schoolId: UUID.school,
      studentId: UUID.student,
      type: ExamType.PRACTICAL,
      status: [ExamStatus.PENDING, ExamStatus.SCHEDULED],
      dateFrom: dateTime,
      dateTo: dateTime,
    });
    await repo.findAll({ status: [] });

    const [sqlNone] = query.mock.calls[0] as [string, unknown[]];
    const [sqlAll, paramsAll] = query.mock.calls[1] as [string, unknown[]];
    const [sqlEmpty] = query.mock.calls[2] as [string, unknown[]];
    expect(sqlNone).not.toMatch(/WHERE/);
    expect(sqlNone).toMatch(/ORDER BY COALESCE\(e\.date_time, e\.preferred_date\) ASC/);
    expect(sqlAll).toMatch(
      /WHERE e\.school_id = \$1 AND e\.student_id = \$2 AND e\.type = \$3 AND e\.status = ANY\(\$4\) AND e\.date_time >= \$5 AND e\.date_time <= \$6/
    );
    expect(paramsAll).toEqual([
      UUID.school,
      UUID.student,
      'practical',
      ['pending', 'scheduled'],
      dateTime,
      dateTime,
    ]);
    expect(sqlEmpty).not.toMatch(/WHERE/);
  });

  it('update : SET dynamique puis relecture ; findById null ; delete', async () => {
    const query = jest
      .fn()
      .mockResolvedValueOnce({ rows: [] }) // UPDATE
      .mockResolvedValueOnce({ rows: [row] }) // relecture
      .mockResolvedValueOnce({ rows: [] }) // findById
      .mockResolvedValueOnce({ rows: [] }); // DELETE
    const repo = new ExamRepository({ query } as unknown as Pool);

    await expect(
      repo.update(UUID.booking, {
        dateTime,
        location: 'Salle 2',
        examinerId: UUID.instructor,
        price: 70,
        status: ExamStatus.COMPLETED,
      })
    ).resolves.toEqual(row);
    const [sqlUpd, paramsUpd] = query.mock.calls[0] as [string, unknown[]];
    expect(sqlUpd).toMatch(
      /SET date_time = \$1, location = \$2, examiner_id = \$3, price = \$4, status = \$5, updated_at = CURRENT_TIMESTAMP WHERE id = \$6/
    );
    expect(paramsUpd).toEqual([
      dateTime,
      'Salle 2',
      UUID.instructor,
      70,
      'completed',
      UUID.booking,
    ]);

    await expect(repo.findById(UUID.booking)).resolves.toBeNull();
    await repo.delete(UUID.booking);
    expect((query.mock.calls[3] as [string, unknown[]])[0]).toMatch(/DELETE FROM exams/);
  });
});
