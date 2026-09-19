import { IProfileRepository } from '../../repositories/profile.repository';
import { StudentProfile } from '../../types/student.types';
import { ProfileService } from '../profile.service';

describe('ProfileService', () => {
  const profile: StudentProfile = {
    id: 'user-1',
    firstName: 'Élève',
    lastName: 'Test',
    email: 'eleve@x.io',
    phone: null,
    address: null,
    dateOfBirth: null,
    licenseNumber: null,
    enrollmentDate: null,
    emergencyContact: null,
    emergencyPhone: null,
    notes: 'Note privée de l’instructeur',
    totalLessons: 3,
    completedLessons: 2,
    totalExams: 1,
    passedExams: 0,
  };
  let repository: jest.Mocked<IProfileRepository>;
  let service: ProfileService;

  beforeEach(() => {
    repository = {
      getStudentProfile: jest.fn(),
      getStudentLessons: jest.fn(),
      getStudentExams: jest.fn(),
      getFinancialSummary: jest.fn(),
      updateNotes: jest.fn(),
      markLessonPaid: jest.fn(),
      markExamPaid: jest.fn(),
    };
    service = new ProfileService(repository);
  });

  it('getCompleteProfile : renvoie la fiche, notes comprises (vue instructeur)', async () => {
    repository.getStudentProfile.mockResolvedValue(profile);

    await expect(service.getCompleteProfile('student-1', 'school-1')).resolves.toEqual(profile);
  });

  it('getCompleteProfile : 404 NOT_FOUND si aucune fiche pour cette école', async () => {
    repository.getStudentProfile.mockResolvedValue(null);

    await expect(service.getCompleteProfile('student-1', 'school-1')).rejects.toMatchObject({
      status: 404,
      code: 'NOT_FOUND',
    });
  });

  it('getOwnProfile : la vue élève ne contient pas les notes privées', async () => {
    repository.getStudentProfile.mockResolvedValue(profile);

    const own = await service.getOwnProfile('user-1', 'school-1');

    expect(own).not.toHaveProperty('notes');
    expect(own).toMatchObject({ id: 'user-1', completedLessons: 2 });
  });

  it('les lectures (leçons, examens, finances) délèguent au repository', async () => {
    repository.getStudentLessons.mockResolvedValue([]);
    repository.getStudentExams.mockResolvedValue([]);
    repository.getFinancialSummary.mockResolvedValue({
      totalRevenue: 0,
      totalPending: 0,
      totalDue: 0,
      lessonsRevenue: 0,
      examsRevenue: 0,
      lessonsPending: 0,
      examsPending: 0,
      lastPaymentDate: null,
    });

    await expect(service.getStudentLessons('student-1', 'school-1')).resolves.toEqual([]);
    await expect(service.getStudentExams('student-1', 'school-1')).resolves.toEqual([]);
    await expect(service.getFinancialSummary('student-1', 'school-1')).resolves.toMatchObject({
      totalDue: 0,
    });
    expect(repository.getStudentLessons).toHaveBeenCalledWith('student-1', 'school-1');
    expect(repository.getStudentExams).toHaveBeenCalledWith('student-1', 'school-1');
    expect(repository.getFinancialSummary).toHaveBeenCalledWith('student-1', 'school-1');
  });

  it('les écritures délèguent au repository avec les mêmes arguments (users.id, lessons.id, exams.id)', async () => {
    repository.updateNotes.mockResolvedValue(true);
    repository.markLessonPaid.mockResolvedValue(true);
    repository.markExamPaid.mockResolvedValue(true);

    await service.updateInstructorNotes('user-1', 'Bon élève');
    await service.markLessonPaid('lesson-1', 40, 'cash');
    await service.markExamPaid('exam-1', 60, 'card');

    expect(repository.updateNotes).toHaveBeenCalledWith('user-1', 'Bon élève');
    expect(repository.markLessonPaid).toHaveBeenCalledWith('lesson-1', 40, 'cash');
    expect(repository.markExamPaid).toHaveBeenCalledWith('exam-1', 60, 'card');
  });

  it('les écritures répondent 404 NOT_FOUND quand aucune ligne n’est touchée', async () => {
    repository.updateNotes.mockResolvedValue(false);
    repository.markLessonPaid.mockResolvedValue(false);
    repository.markExamPaid.mockResolvedValue(false);

    await expect(service.updateInstructorNotes('ghost', 'x')).rejects.toMatchObject({
      status: 404,
      message: 'Fiche élève introuvable',
    });
    await expect(service.markLessonPaid('ghost', 40, 'cash')).rejects.toMatchObject({
      status: 404,
      message: 'Leçon introuvable',
    });
    await expect(service.markExamPaid('ghost', 60, 'card')).rejects.toMatchObject({
      status: 404,
      message: 'Examen introuvable',
    });
  });
});
