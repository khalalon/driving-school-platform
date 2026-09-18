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

  it('findById / findByStudentAndSchool : null quand aucune ligne', async () => {
    const repo = new EnrollmentRepository(fakePool([]).pool);

    await expect(repo.findById(UUID.request)).resolves.toBeNull();
    await expect(repo.findByStudentAndSchool('user-1', UUID.school)).resolves.toBeNull();
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
  it('getStudentProfile : agrège fiche, compte de leçons et statistiques d’examens', async () => {
    const query = jest
      .fn()
      .mockResolvedValueOnce({
        rows: [{ id: UUID.student, firstName: 'Élève', lastName: 'Test', completedLessons: 2 }],
      })
      .mockResolvedValueOnce({ rows: [{ total: '3' }] })
      .mockResolvedValueOnce({ rows: [{ total: '2', passed: '1' }] });
    const repo = new ProfileRepository({ query } as unknown as import('pg').Pool);

    await expect(repo.getStudentProfile(UUID.student, UUID.school)).resolves.toEqual({
      id: UUID.student,
      firstName: 'Élève',
      lastName: 'Test',
      completedLessons: 2,
      totalLessons: 3,
      totalExams: 2,
      passedExams: 1,
    });
  });

  it('getStudentProfile : null si la fiche n’existe pas (une seule requête)', async () => {
    const { pool, query } = fakePool([]);
    await expect(
      new ProfileRepository(pool).getStudentProfile(UUID.student, UUID.school)
    ).resolves.toBeNull();
    expect(query).toHaveBeenCalledTimes(1);
  });

  it('getFinancialSummary : convertit les DECIMAL en nombres et additionne', async () => {
    const query = jest
      .fn()
      .mockResolvedValueOnce({ rows: [{ lessonsRevenue: '80.00', lessonsPending: '40.00' }] })
      .mockResolvedValueOnce({ rows: [{ examsRevenue: '60.00', examsPending: '0' }] })
      .mockResolvedValueOnce({ rows: [{ lastPaymentDate: null }] });
    const repo = new ProfileRepository({ query } as unknown as import('pg').Pool);

    await expect(repo.getFinancialSummary(UUID.student, UUID.school)).resolves.toEqual({
      totalRevenue: 140,
      totalPending: 40,
      totalDue: 40,
      lessonsRevenue: 80,
      examsRevenue: 60,
      lessonsPending: 40,
      examsPending: 0,
      lastPaymentDate: null,
    });
  });

  it('écritures : paramètres dans l’ordre attendu par le SQL', async () => {
    const { pool, query } = fakePool([]);
    const repo = new ProfileRepository(pool);

    await repo.updateNotes(UUID.student, 'Bon élève');
    await repo.markLessonPaid(UUID.booking, 40, 'cash');
    await repo.markExamPaid(UUID.booking, 60, 'card');
    await repo.getStudentLessons(UUID.student, UUID.school);
    await repo.getStudentExams(UUID.student, UUID.school);

    expect((query.mock.calls[0] as [string, unknown[]])[1]).toEqual(['Bon élève', UUID.student]);
    expect((query.mock.calls[1] as [string, unknown[]])[1]).toEqual([40, 'cash', UUID.booking]);
    expect((query.mock.calls[2] as [string, unknown[]])[1]).toEqual([60, 'card', UUID.booking]);
    expect(query).toHaveBeenCalledTimes(5);
  });
});
