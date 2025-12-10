import { IStudentRepository } from '../repositories/student.repository';
import { IStatsRepository } from '../repositories/stats.repository';
import { EnrollmentStatus, ExamEligibility, LessonCompletedDTO } from '../types';

export class VerificationService {
  private readonly REQUIRED_LESSONS_THEORY = 20;
  private readonly REQUIRED_LESSONS_PRACTICAL = 30;

  constructor(
    private readonly studentRepository: IStudentRepository,
    private readonly statsRepository: IStatsRepository
  ) {}

  async verifyEnrollment(userId: string, schoolId: string): Promise<EnrollmentStatus> {
    const student = await this.studentRepository.findByUserAndSchool(userId, schoolId);

    if (student && student.authorized) {
      return {
        isEnrolled: true,
        requestStatus: 'approved',
        enrollmentDate: student.enrollmentDate,
        canBook: true,
      };
    }

    return {
      isEnrolled: false,
      canBook: false,
    };
  }

  async checkExamEligibility(
    studentId: string,
    schoolId: string,
    examType: 'theory' | 'practical'
  ): Promise<ExamEligibility> {
    const stats = await this.statsRepository.findByStudentAndSchool(studentId, schoolId);

    const completedLessons = stats?.completedLessons || 0;
    const requiredLessons =
      examType === 'theory' ? this.REQUIRED_LESSONS_THEORY : this.REQUIRED_LESSONS_PRACTICAL;

    if (completedLessons < requiredLessons) {
      return {
        eligible: false,
        requiredLessons,
        completedLessons,
        reason: `Student needs ${requiredLessons - completedLessons} more completed lessons`,
      };
    }

    return {
      eligible: true,
      requiredLessons,
      completedLessons,
    };
  }

  async recordLessonCompletion(studentId: string, data: LessonCompletedDTO) {
    return this.statsRepository.incrementLessonCount(studentId, data);
  }
}
