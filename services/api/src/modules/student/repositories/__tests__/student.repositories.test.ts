import { LessonType } from '../../../../types/domain';
import { fakePool, UUID } from '../../../../test-utils/http';
import { EnrollmentRepository } from '../enrollment.repository';
import { ProfileRepository } from '../profile.repository';
import { StatsRepository } from '../stats.repository';
import { StudentRepository } from '../student.repository';

/** Les repositories sont vérifiés sur le SQL émis et ses paramètres, avec un Pool factice. */
describe('EnrollmentRepository', () => {
  it('create : INSERT avec student_id = users.id et message null par défaut', async () => {
    const { pool, query } = fakePool([{ id: UUID.request }]);
    const repo = new EnrollmentRepository(pool);

    const result = await repo.create('user-1', UUID.school);

    expect(result).toEqual({ id: UUID.request });
    const [sql, params] = query.mock.calls[0] as [string, unknown[]];
    expect(sql).toMatch(/INSERT INTO enrollment_requests/);
    expect(params).toEqual(['user-1', UUID.school, null]);
  });

  it('findBySchool : le filtre status ajoute un second paramètre', async () => {
    const { pool, query } = fakePool([]);
    const repo = new EnrollmentRepository(pool);

    await repo.findBySchool(UUID.school);
    await repo.findBySchool(UUID.school, 'pending');

    const [sqlAll, paramsAll] = query.mock.calls[0] as [string, unknown[]];
    const [sqlFiltered, paramsFiltered] = query.mock.calls[1] as [string, unknown[]];
    expect(sqlAll).not.toMatch(/er\.status = \$2/);
    expect(sqlAll).toMatch(/u.first_name AS "studentFirstName"/);
    expect(paramsAll).toEqual([UUID.school]);
    expect(sqlFiltered).toMatch(/er\.status = \$2/);
    expect(paramsFiltered).toEqual([UUID.school, 'pending']);
  });

  it('findById / findByStudentAndSchool : null quand aucune ligne ; findByStudent joint l’école', async () => {
    const { pool, query } = fakePool([]);
    const repo = new EnrollmentRepository(pool);

    await expect(repo.findById(UUID.request)).resolves.toBeNull();
    await expect(repo.findByStudentAndSchool('user-1', UUID.school)).resolves.toBeNull();
    await expect(repo.findByStudent('user-1')).resolves.toEqual([]);
    const [sql, params] = query.mock.calls[2] as [string, unknown[]];
    expect(sql).toMatch(/s\.name AS "schoolName", s\.address AS "schoolAddress"/);
    expect(params).toEqual(['user-1']);

    await expect(repo.findActiveByStudent('user-1')).resolves.toBeNull();
    const [sqlActive, paramsActive] = query.mock.calls[3] as [string, unknown[]];
    expect(sqlActive).toMatch(
      /WHERE er\.student_id = \$1 AND er\.status IN \('pending', 'approved'\)/
    );
    expect(paramsActive).toEqual(['user-1']);
  });

  it('updateStatus : statut, auteur, motif (null si absent), identifiant', async () => {
    const { pool, query } = fakePool([{ id: UUID.request, status: 'approved' }]);
    const repo = new EnrollmentRepository(pool);

    await repo.updateStatus(UUID.request, 'approved', 'user-instr');

    const [, params] = query.mock.calls[0] as [string, unknown[]];
    expect(params).toEqual(['approved', 'user-instr', null, UUID.request]);
  });
});

describe('StudentRepository', () => {
  it('create : paramètres dans l’ordre (user, école, autorisé, demande)', async () => {
    const { pool, query } = fakePool([{ id: UUID.student }]);
    const repo = new StudentRepository(pool);

    await repo.create({
      userId: 'user-1',
      schoolId: UUID.school,
      authorized: true,
      enrollmentRequestId: UUID.request,
    });

    const [sql, params] = query.mock.calls[0] as [string, unknown[]];
    expect(sql).toMatch(/INSERT INTO students/);
    expect(params).toEqual(['user-1', UUID.school, true, UUID.request]);
  });

  it('lectures : null ou ligne, liste par école avec email', async () => {
    const row = { id: UUID.student, userId: 'user-1', schoolId: UUID.school, authorized: true };
    const repo = new StudentRepository(fakePool([row]).pool);

    await expect(repo.findById(UUID.student)).resolves.toEqual(row);
    await expect(repo.findByUserId('user-1')).resolves.toEqual(row);
    await expect(repo.findByUserAndSchool('user-1', UUID.school)).resolves.toEqual(row);
    await expect(repo.findBySchool(UUID.school)).resolves.toEqual([row]);
    await expect(new StudentRepository(fakePool([]).pool).findById('x')).resolves.toBeNull();
  });
});

describe('StatsRepository', () => {
  it('incrementLessonCount : CODE compte en théorie, Parc / Manœuvre en pratique', async () => {
    const { pool, query } = fakePool([{ completedLessons: 1 }]);
    const repo = new StatsRepository(pool);

    await repo.incrementLessonCount(UUID.student, {
      schoolId: UUID.school,
      lessonType: LessonType.CODE,
      attended: true,
    });
    await repo.incrementLessonCount(UUID.student, {
      schoolId: UUID.school,
      lessonType: LessonType.MANOEUVRE,
      attended: true,
    });

    expect((query.mock.calls[0] as [string, unknown[]])[1]).toEqual([
      UUID.student,
      UUID.school,
      1,
      0,
    ]);
    expect((query.mock.calls[1] as [string, unknown[]])[1]).toEqual([
      UUID.student,
      UUID.school,
      0,
      1,
    ]);
  });

  it('findByStudentAndSchool : null sans ligne', async () => {
    await expect(
      new StatsRepository(fakePool([]).pool).findByStudentAndSchool(UUID.student, UUID.school)
    ).resolves.toBeNull();
  });
});

describe('ProfileRepository', () => {
  it('getStudentProfile : une requête, fiche résolue par users.id + école (D-28), compteurs en sous-requêtes', async () => {
    const row = {
      id: 'user-1',
      firstName: 'Élève',
      lastName: 'Test',
      totalLessons: 3,
      completedLessons: 2,
    };
    const { pool, query } = fakePool([row]);

    await expect(
      new ProfileRepository(pool).getStudentProfile('user-1', UUID.school)
    ).resolves.toEqual(row);

    const [sql, params] = query.mock.calls[0] as [string, unknown[]];
    expect(sql).toMatch(/WHERE s\.user_id = \$1 AND s\.school_id = \$2/);
    expect(sql).toMatch(/l\.status IN \('scheduled', 'completed'\)/);
    expect(sql).toMatch(/e\.result = 'passed'/);
    expect(params).toEqual(['user-1', UUID.school]);
  });

  it('getStudentProfile : null si la fiche n’existe pas (une seule requête)', async () => {
    const { pool, query } = fakePool([]);
    await expect(
      new ProfileRepository(pool).getStudentProfile(UUID.student, UUID.school)
    ).resolves.toBeNull();
    expect(query).toHaveBeenCalledTimes(1);
  });

  it('getFinancialSummary : une requête sur lessons + exams, DECIMAL convertis et additionnés', async () => {
    const { pool, query } = fakePool([
      {
        lessonsRevenue: '80.00',
        lessonsPending: '40.00',
        examsRevenue: '60.00',
        examsPending: '0',
        lastPaymentDate: null,
      },
    ]);
    const repo = new ProfileRepository(pool);

    await expect(repo.getFinancialSummary(UUID.student, UUID.school)).resolves.toEqual({
      totalRevenue: 140,
      totalPending: 40,
      totalDue: 40,
      lessonsRevenue: 80,
      examsRevenue: 60,
      lessonsPending: 40,
      examsPending: 0,
      lastPaymentDate: null,
      credit: 0,
    });
    const [sql] = query.mock.calls[0] as [string, unknown[]];
    expect(sql).toMatch(/FROM lessons l WHERE l\.student_id IN/);
    expect(sql).toMatch(/FROM exams e WHERE e\.student_id IN/);
    expect(sql).toMatch(/\(SELECT credit FROM student\) AS credit/);
    // D-41 : une absence sort du dû
    expect(sql).toMatch(/AND l\.attended IS DISTINCT FROM FALSE/);
  });

  it('findLessonBilling : école et présence de la leçon (P6, D-41) ; null si inconnue', async () => {
    const { pool, query } = fakePool([{ schoolId: UUID.school, attended: false }]);
    await expect(new ProfileRepository(pool).findLessonBilling(UUID.booking)).resolves.toEqual({
      schoolId: UUID.school,
      attended: false,
    });
    const [sql, params] = query.mock.calls[0] as [string, unknown[]];
    expect(sql).toMatch(/SELECT school_id AS "schoolId", attended FROM lessons WHERE id = \$1/);
    expect(params).toEqual([UUID.booking]);
    await expect(
      new ProfileRepository(fakePool([]).pool).findLessonBilling('ghost')
    ).resolves.toBeNull();
  });

  it('getFinancialSummary : l’avoir de l’élève (D-40) est renvoyé converti', async () => {
    const { pool } = fakePool([
      {
        lessonsRevenue: '0',
        lessonsPending: '0',
        examsRevenue: '0',
        examsPending: '0',
        lastPaymentDate: null,
        credit: '40.00',
      },
    ]);
    await expect(
      new ProfileRepository(pool).getFinancialSummary(UUID.student, UUID.school)
    ).resolves.toMatchObject({ credit: 40 });
  });

  it('écritures : paramètres dans l’ordre du SQL, vrai si une ligne est touchée ; lectures sur lessons / exams', async () => {
    const query = jest.fn().mockResolvedValue({ rows: [], rowCount: 1 });
    const repo = new ProfileRepository({ query } as unknown as import('pg').Pool);

    await expect(repo.updateNotes('user-1', 'Bon élève')).resolves.toBe(true);
    await expect(repo.markLessonPaid(UUID.booking, 40, 'cash')).resolves.toBe(true);
    await expect(repo.markExamPaid(UUID.booking, 60, 'card')).resolves.toBe(true);
    await repo.getStudentLessons('user-1', UUID.school);
    await repo.getStudentExams('user-1', UUID.school);

    const calls = query.mock.calls as [string, unknown[]][];
    expect(calls[0][0]).toMatch(
      /UPDATE students SET notes = \$1, updated_at = CURRENT_TIMESTAMP WHERE user_id = \$2/
    );
    expect(calls[0][1]).toEqual(['Bon élève', 'user-1']);
    expect(calls[1][0]).toMatch(/UPDATE lessons/);
    expect(calls[1][1]).toEqual([40, 'cash', UUID.booking]);
    expect(calls[2][0]).toMatch(/UPDATE exams/);
    expect(calls[2][1]).toEqual([60, 'card', UUID.booking]);
    expect(calls[3][0]).toMatch(/FROM lessons l\s+JOIN students s ON s\.id = l\.student_id/);
    expect(calls[3][0]).toMatch(/LEFT JOIN users iu ON iu\.id = i\.user_id/);
    expect(calls[3][1]).toEqual(['user-1', UUID.school]);
    expect(calls[4][0]).toMatch(/FROM exams e\s+JOIN students s ON s\.id = e\.student_id/);

    const none = new ProfileRepository(fakePool([]).pool);
    await expect(none.updateNotes('ghost', 'x')).resolves.toBe(false);
    await expect(none.markLessonPaid('ghost', 1, 'cash')).resolves.toBe(false);
    await expect(none.markExamPaid('ghost', 1, 'cash')).resolves.toBe(false);
  });
});

describe('StudentRepository — avoir de l’élève (D-40)', () => {
  it('getCreditForUpdate : SELECT … FOR UPDATE par users.id, 0 sans fiche', async () => {
    const { pool, query } = fakePool([{ credit: 25.5 }]);
    const repo = new StudentRepository(pool);

    await expect(repo.getCreditForUpdate('user-1')).resolves.toBe(25.5);
    const [sql, params] = query.mock.calls[0] as [string, unknown[]];
    expect(sql).toMatch(
      /SELECT credit::float8 AS credit FROM students WHERE user_id = \$1 FOR UPDATE/
    );
    expect(params).toEqual(['user-1']);

    await expect(
      new StudentRepository(fakePool([]).pool).getCreditForUpdate('ghost')
    ).resolves.toBe(0);
  });

  it('addCredit : UPDATE credit = credit + delta sur le client fourni, nouveau solde renvoyé', async () => {
    const txQuery = jest.fn().mockResolvedValue({ rows: [{ credit: 15 }] });
    const { pool, query } = fakePool([]);
    const repo = new StudentRepository(pool);

    await expect(repo.addCredit('user-1', -25, { query: txQuery })).resolves.toBe(15);
    const [sql, params] = txQuery.mock.calls[0] as [string, unknown[]];
    expect(sql).toMatch(/UPDATE students SET credit = credit \+ \$2/);
    expect(sql).toMatch(/WHERE user_id = \$1/);
    expect(params).toEqual(['user-1', -25]);
    expect(query).not.toHaveBeenCalled();

    await expect(repo.addCredit('ghost', 10)).rejects.toThrow(/introuvable/);
  });
});
