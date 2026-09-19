import { HttpError } from '../../../http/errors';
import { IProfileRepository } from '../repositories/profile.repository';
import {
  ExamHistory,
  FinancialSummary,
  LessonHistory,
  StudentProfile,
} from '../types/student.types';

/**
 * Fiche élève (P1–P11), identifiant = users.id (D-28). Les bornes des payloads (`notes` non vide,
 * `amount` > 0…) sont validées par Joi.
 */
export class ProfileService {
  constructor(private readonly profileRepository: IProfileRepository) {}

  async getCompleteProfile(studentId: string, schoolId: string): Promise<StudentProfile> {
    const profile = await this.profileRepository.getStudentProfile(studentId, schoolId);
    if (!profile) {
      throw new HttpError(404, 'NOT_FOUND', 'Fiche élève introuvable pour cette école');
    }
    return profile;
  }

  /** Vue élève de sa propre fiche : sans les notes privées de l'instructeur. */
  async getOwnProfile(studentId: string, schoolId: string): Promise<Omit<StudentProfile, 'notes'>> {
    const { notes, ...profile } = await this.getCompleteProfile(studentId, schoolId);
    return profile;
  }

  getStudentLessons(studentId: string, schoolId: string): Promise<LessonHistory[]> {
    return this.profileRepository.getStudentLessons(studentId, schoolId);
  }

  getStudentExams(studentId: string, schoolId: string): Promise<ExamHistory[]> {
    return this.profileRepository.getStudentExams(studentId, schoolId);
  }

  getFinancialSummary(studentId: string, schoolId: string): Promise<FinancialSummary> {
    return this.profileRepository.getFinancialSummary(studentId, schoolId);
  }

  async updateInstructorNotes(userId: string, notes: string): Promise<void> {
    if (!(await this.profileRepository.updateNotes(userId, notes))) {
      throw new HttpError(404, 'NOT_FOUND', 'Fiche élève introuvable');
    }
  }

  async markLessonPaid(lessonId: string, amount: number, paymentMethod: string): Promise<void> {
    if (!(await this.profileRepository.markLessonPaid(lessonId, amount, paymentMethod))) {
      throw new HttpError(404, 'NOT_FOUND', 'Leçon introuvable');
    }
  }

  async markExamPaid(examId: string, amount: number, paymentMethod: string): Promise<void> {
    if (!(await this.profileRepository.markExamPaid(examId, amount, paymentMethod))) {
      throw new HttpError(404, 'NOT_FOUND', 'Examen introuvable');
    }
  }
}
