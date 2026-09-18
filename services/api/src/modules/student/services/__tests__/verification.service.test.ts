import { LessonType } from '../../../../types/domain';
import { IStatsRepository } from '../../repositories/stats.repository';
import { IStudentRepository } from '../../repositories/student.repository';
import { StudentLessonStats } from '../../types/student.types';
import { VerificationService } from '../verification.service';

describe('VerificationService', () => {
  let studentRepository: jest.Mocked<IStudentRepository>;
  let statsRepository: jest.Mocked<IStatsRepository>;
  let service: VerificationService;

  const stats: StudentLessonStats = {
    id: 'stats-1',
    studentId: 'student-1',
    schoolId: 'school-1',
    completedLessons: 12,
    completedTheoryLessons: 4,
    completedPracticalLessons: 8,
    lastLessonDate: null,
    updatedAt: new Date('2026-09-18T10:00:00Z'),
  };

  beforeEach(() => {
    studentRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      findByUserId: jest.fn(),
      findByUserAndSchool: jest.fn(),
      findBySchool: jest.fn(),
    };
    statsRepository = { findByStudentAndSchool: jest.fn(), incrementLessonCount: jest.fn() };
    service = new VerificationService(studentRepository, statsRepository);
  });

  it('verifyEnrollment : autorisé → canBook, sinon rien', async () => {
    studentRepository.findByUserAndSchool.mockResolvedValueOnce({
      id: 's',
      userId: 'u',
      schoolId: 'school-1',
      authorized: true,
      enrollmentRequestId: null,
      enrollmentDate: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    await expect(service.verifyEnrollment('u', 'school-1')).resolves.toMatchObject({
      isEnrolled: true,
      canBook: true,
    });

    studentRepository.findByUserAndSchool.mockResolvedValueOnce(null);
    await expect(service.verifyEnrollment('u', 'school-1')).resolves.toEqual({
      isEnrolled: false,
      canBook: false,
    });
  });

  it('checkExamEligibility : sous le seuil, non éligible avec le manque ; au-dessus, éligible', async () => {
    statsRepository.findByStudentAndSchool.mockResolvedValue(stats);

    await expect(service.checkExamEligibility('student-1', 'school-1', 'theory')).resolves.toEqual({
      eligible: false,
      requiredLessons: 20,
      completedLessons: 12,
      reason: 'Il manque 8 leçon(s) effectuée(s)',
    });

    statsRepository.findByStudentAndSchool.mockResolvedValue({ ...stats, completedLessons: 31 });
    await expect(
      service.checkExamEligibility('student-1', 'school-1', 'practical')
    ).resolves.toEqual({ eligible: true, requiredLessons: 30, completedLessons: 31 });
  });

  it('checkExamEligibility : sans statistiques, 0 leçon', async () => {
    statsRepository.findByStudentAndSchool.mockResolvedValue(null);

    await expect(
      service.checkExamEligibility('student-1', 'school-1', 'theory')
    ).resolves.toMatchObject({ eligible: false, completedLessons: 0 });
  });

  it('recordLessonCompletion : présent → incrémente', async () => {
    statsRepository.incrementLessonCount.mockResolvedValue({ ...stats, completedLessons: 13 });
    const dto = { schoolId: 'school-1', lessonType: LessonType.PARC, attended: true };

    const result = await service.recordLessonCompletion('student-1', dto);

    expect(statsRepository.incrementLessonCount).toHaveBeenCalledWith('student-1', dto);
    expect(result.completedLessons).toBe(13);
  });

  it('recordLessonCompletion : absent → pas d’incrément, état courant renvoyé (D-33)', async () => {
    statsRepository.findByStudentAndSchool.mockResolvedValue(stats);
    const dto = { schoolId: 'school-1', lessonType: LessonType.CODE, attended: false };

    await expect(service.recordLessonCompletion('student-1', dto)).resolves.toEqual(stats);
    expect(statsRepository.incrementLessonCount).not.toHaveBeenCalled();
  });

  it('recordLessonCompletion : absent sans statistiques → 404', async () => {
    statsRepository.findByStudentAndSchool.mockResolvedValue(null);

    await expect(
      service.recordLessonCompletion('student-1', {
        schoolId: 'school-1',
        lessonType: LessonType.CODE,
        attended: false,
      })
    ).rejects.toMatchObject({ status: 404 });
  });
});
