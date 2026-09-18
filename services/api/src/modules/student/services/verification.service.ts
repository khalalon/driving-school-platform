import { HttpError } from '../../../http/errors';
import { IStatsRepository } from '../repositories/stats.repository';
import { IStudentRepository } from '../repositories/student.repository';
import {
  EnrollmentStatus,
  ExamEligibility,
  LessonCompletedDTO,
  StudentLessonStats,
} from '../types/student.types';

export type ExamType = 'theory' | 'practical';

/**
 * Porté tel quel depuis student-service. La règle d'éligibilité (20 / 30 leçons) est
 * supprimée en v1 (D-26) : `checkExamEligibility` disparaît en 5.7 avec les routes hors contrat.
 */
export class VerificationService {
  private static readonly REQUIRED_LESSONS: Record<ExamType, number> = {
    theory: 20,
    practical: 30,
  };

  constructor(
    private readonly studentRepository: IStudentRepository,
    private readonly statsRepository: IStatsRepository
  ) {}

  async verifyEnrollment(userId: string, schoolId: string): Promise<EnrollmentStatus> {
    const student = await this.studentRepository.findByUserAndSchool(userId, schoolId);
    if (student?.authorized) {
      return {
        isEnrolled: true,
        requestStatus: 'approved',
        enrollmentDate: student.enrollmentDate,
        canBook: true,
      };
    }
    return { isEnrolled: false, canBook: false };
  }

  async checkExamEligibility(
    studentId: string,
    schoolId: string,
    examType: ExamType
  ): Promise<ExamEligibility> {
    const stats = await this.statsRepository.findByStudentAndSchool(studentId, schoolId);
    const completedLessons = stats?.completedLessons ?? 0;
    const requiredLessons = VerificationService.REQUIRED_LESSONS[examType];

    if (completedLessons < requiredLessons) {
      return {
        eligible: false,
        requiredLessons,
        completedLessons,
        reason: `Il manque ${requiredLessons - completedLessons} leçon(s) effectuée(s)`,
      };
    }
    return { eligible: true, requiredLessons, completedLessons };
  }

  /** Une absence n'incrémente rien (D-33) ; l'état courant est renvoyé s'il existe. */
  async recordLessonCompletion(
    studentId: string,
    data: LessonCompletedDTO
  ): Promise<StudentLessonStats> {
    if (!data.attended) {
      const existing = await this.statsRepository.findByStudentAndSchool(studentId, data.schoolId);
      if (!existing) {
        throw new HttpError(404, 'NOT_FOUND', 'Aucune statistique pour cet élève dans cette école');
      }
      return existing;
    }
    return this.statsRepository.incrementLessonCount(studentId, data);
  }
}
