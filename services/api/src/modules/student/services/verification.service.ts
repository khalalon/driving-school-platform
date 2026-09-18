import { HttpError } from '../../../http/errors';
import { IStatsRepository } from '../repositories/stats.repository';
import { IStudentRepository } from '../repositories/student.repository';
import { EnrollmentStatus, LessonCompletedDTO, StudentLessonStats } from '../types/student.types';

/**
 * Porté depuis student-service. La règle d'éligibilité aux examens (20 / 30 leçons) a été
 * supprimée (D-26, 3.4) ; les routes restantes disparaissent en 5.7.
 */
export class VerificationService {
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
