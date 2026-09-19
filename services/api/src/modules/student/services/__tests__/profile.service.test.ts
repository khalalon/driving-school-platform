import { SchoolGuard } from '../../../../http/authz';
import { AuthUser, UserRole } from '../../../../types/auth';
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
  // Cloisonnement (D-20) : instructeur de school-1 ; un admin passe partout.
  const instructor: AuthUser = { userId: 'user-instr', email: 'i@x.io', role: UserRole.INSTRUCTOR };
  const admin: AuthUser = { userId: 'user-admin', email: 'a@x.io', role: UserRole.ADMIN };
  const instructorLookup = { findByUserId: jest.fn() };

  beforeEach(() => {
    repository = {
      getStudentProfile: jest.fn(),
      getStudentLessons: jest.fn(),
      getStudentExams: jest.fn(),
      getFinancialSummary: jest.fn(),
      findStudentSchool: jest.fn(),
      findLessonSchool: jest.fn(),
      findExamSchool: jest.fn(),
      updateNotes: jest.fn(),
      markLessonPaid: jest.fn(),
      markExamPaid: jest.fn(),
    };
    instructorLookup.findByUserId.mockResolvedValue({ id: 'instr-1', schoolId: 'school-1' });
    service = new ProfileService(repository, new SchoolGuard(instructorLookup));
  });

  it('getCompleteProfile : renvoie la fiche, notes comprises (vue instructeur)', async () => {
    repository.getStudentProfile.mockResolvedValue(profile);

    await expect(service.getCompleteProfile(instructor, 'user-1', 'school-1')).resolves.toEqual(
      profile
    );
    expect(repository.getStudentProfile).toHaveBeenCalledWith('user-1', 'school-1');
  });

  it('P1–P4 : 403 FORBIDDEN_SCHOOL hors de l’école de l’instructeur ; l’admin passe (D-20)', async () => {
    repository.getStudentProfile.mockResolvedValue(profile);
    repository.getStudentLessons.mockResolvedValue([]);

    await expect(
      service.getCompleteProfile(instructor, 'user-1', 'school-2')
    ).rejects.toMatchObject({
      status: 403,
      code: 'FORBIDDEN_SCHOOL',
    });
    await expect(service.getStudentLessons(instructor, 'user-1', 'school-2')).rejects.toMatchObject(
      {
        status: 403,
      }
    );
    expect(repository.getStudentProfile).not.toHaveBeenCalled();

    await expect(service.getCompleteProfile(admin, 'user-1', 'school-2')).resolves.toEqual(profile);
  });

  it('getCompleteProfile : 404 NOT_FOUND si aucune fiche pour cette école', async () => {
    repository.getStudentProfile.mockResolvedValue(null);

    await expect(
      service.getCompleteProfile(instructor, 'student-1', 'school-1')
    ).rejects.toMatchObject({
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
      credit: 0,
    });

    await expect(service.getStudentLessons(instructor, 'user-1', 'school-1')).resolves.toEqual([]);
    await expect(service.getStudentExams(instructor, 'user-1', 'school-1')).resolves.toEqual([]);
    await expect(
      service.getFinancialSummary(instructor, 'user-1', 'school-1')
    ).resolves.toMatchObject({ totalDue: 0 });
    await expect(service.getOwnLessons('user-1', 'school-1')).resolves.toEqual([]);
    await expect(service.getOwnExams('user-1', 'school-1')).resolves.toEqual([]);
    await expect(service.getOwnFinancialSummary('user-1', 'school-1')).resolves.toMatchObject({
      totalDue: 0,
    });
    expect(repository.getStudentLessons).toHaveBeenCalledWith('user-1', 'school-1');
    expect(repository.getStudentExams).toHaveBeenCalledWith('user-1', 'school-1');
    expect(repository.getFinancialSummary).toHaveBeenCalledWith('user-1', 'school-1');
  });

  it('les écritures délèguent au repository avec les mêmes arguments (users.id, lessons.id, exams.id)', async () => {
    repository.findStudentSchool.mockResolvedValue('school-1');
    repository.findLessonSchool.mockResolvedValue('school-1');
    repository.findExamSchool.mockResolvedValue('school-1');
    repository.updateNotes.mockResolvedValue(true);
    repository.markLessonPaid.mockResolvedValue(true);
    repository.markExamPaid.mockResolvedValue(true);

    await service.updateInstructorNotes(instructor, 'user-1', 'Bon élève');
    await service.markLessonPaid(instructor, 'lesson-1', 40, 'cash');
    await service.markExamPaid(instructor, 'exam-1', 60, 'card');

    expect(repository.updateNotes).toHaveBeenCalledWith('user-1', 'Bon élève');
    expect(repository.markLessonPaid).toHaveBeenCalledWith('lesson-1', 40, 'cash');
    expect(repository.markExamPaid).toHaveBeenCalledWith('exam-1', 60, 'card');
  });

  it('les écritures répondent 404 NOT_FOUND quand la ressource est inconnue', async () => {
    repository.findStudentSchool.mockResolvedValue(null);
    repository.findLessonSchool.mockResolvedValue(null);
    repository.findExamSchool.mockResolvedValue(null);

    await expect(service.updateInstructorNotes(instructor, 'ghost', 'x')).rejects.toMatchObject({
      status: 404,
      message: 'Fiche élève introuvable',
    });
    await expect(service.markLessonPaid(instructor, 'ghost', 40, 'cash')).rejects.toMatchObject({
      status: 404,
      message: 'Leçon introuvable',
    });
    await expect(service.markExamPaid(instructor, 'ghost', 60, 'card')).rejects.toMatchObject({
      status: 404,
      message: 'Examen introuvable',
    });
    expect(repository.updateNotes).not.toHaveBeenCalled();
  });

  it('P5–P7 : 403 FORBIDDEN_SCHOOL quand la ressource est dans une autre école (D-20)', async () => {
    repository.findStudentSchool.mockResolvedValue('school-2');
    repository.findLessonSchool.mockResolvedValue('school-2');
    repository.findExamSchool.mockResolvedValue('school-2');

    await expect(service.updateInstructorNotes(instructor, 'user-1', 'x')).rejects.toMatchObject({
      status: 403,
      code: 'FORBIDDEN_SCHOOL',
    });
    await expect(service.markLessonPaid(instructor, 'lesson-1', 40, 'cash')).rejects.toMatchObject({
      status: 403,
    });
    await expect(service.markExamPaid(instructor, 'exam-1', 60, 'card')).rejects.toMatchObject({
      status: 403,
    });
    expect(repository.markLessonPaid).not.toHaveBeenCalled();

    repository.markLessonPaid.mockResolvedValue(true);
    await service.markLessonPaid(admin, 'lesson-1', 40, 'cash');
    expect(repository.markLessonPaid).toHaveBeenCalledWith('lesson-1', 40, 'cash');
  });
});
