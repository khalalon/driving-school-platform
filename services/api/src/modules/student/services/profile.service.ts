import { SchoolGuard } from '../../../http/authz';
import { HttpError } from '../../../http/errors';
import { AuthUser } from '../../../types/auth';
import { IProfileRepository } from '../repositories/profile.repository';
import {
  ExamHistory,
  FinancialSummary,
  LessonHistory,
  StudentProfile,
} from '../types/student.types';

/**
 * Fiche élève (P1–P11), identifiant = users.id (D-28). La vue école (P1–P7) est cloisonnée à
 * l'école de l'instructeur appelant (D-20, `SchoolGuard`) ; l'admin voit tout. Les bornes des
 * payloads (`notes` non vide, `amount` > 0…) sont validées par Joi.
 */
export class ProfileService {
  constructor(
    private readonly profileRepository: IProfileRepository,
    private readonly schoolGuard: SchoolGuard
  ) {}

  // --- Vue école (P1–P7) ---

  async getCompleteProfile(
    caller: AuthUser,
    userId: string,
    schoolId: string
  ): Promise<StudentProfile> {
    await this.schoolGuard.assertSameSchool(caller, schoolId);
    return this.requireProfile(userId, schoolId);
  }

  async getStudentLessons(
    caller: AuthUser,
    userId: string,
    schoolId: string
  ): Promise<LessonHistory[]> {
    await this.schoolGuard.assertSameSchool(caller, schoolId);
    return this.profileRepository.getStudentLessons(userId, schoolId);
  }

  async getStudentExams(
    caller: AuthUser,
    userId: string,
    schoolId: string
  ): Promise<ExamHistory[]> {
    await this.schoolGuard.assertSameSchool(caller, schoolId);
    return this.profileRepository.getStudentExams(userId, schoolId);
  }

  async getFinancialSummary(
    caller: AuthUser,
    userId: string,
    schoolId: string
  ): Promise<FinancialSummary> {
    await this.schoolGuard.assertSameSchool(caller, schoolId);
    return this.profileRepository.getFinancialSummary(userId, schoolId);
  }

  /** P5 : la fiche `students` de l'élève (unique, D-22) doit être dans l'école de l'appelant. */
  async updateInstructorNotes(caller: AuthUser, userId: string, notes: string): Promise<void> {
    const schoolId = await this.profileRepository.findStudentSchool(userId);
    if (!schoolId) {
      throw new HttpError(404, 'NOT_FOUND', 'Fiche élève introuvable');
    }
    await this.schoolGuard.assertSameSchool(caller, schoolId);
    await this.profileRepository.updateNotes(userId, notes);
  }

  /** P6 : la leçon doit être dans l'école de l'appelant. */
  async markLessonPaid(
    caller: AuthUser,
    lessonId: string,
    amount: number,
    paymentMethod: string
  ): Promise<void> {
    const schoolId = await this.profileRepository.findLessonSchool(lessonId);
    if (!schoolId) {
      throw new HttpError(404, 'NOT_FOUND', 'Leçon introuvable');
    }
    await this.schoolGuard.assertSameSchool(caller, schoolId);
    await this.profileRepository.markLessonPaid(lessonId, amount, paymentMethod);
  }

  /** P7 : l'examen doit être dans l'école de l'appelant. */
  async markExamPaid(
    caller: AuthUser,
    examId: string,
    amount: number,
    paymentMethod: string
  ): Promise<void> {
    const schoolId = await this.profileRepository.findExamSchool(examId);
    if (!schoolId) {
      throw new HttpError(404, 'NOT_FOUND', 'Examen introuvable');
    }
    await this.schoolGuard.assertSameSchool(caller, schoolId);
    await this.profileRepository.markExamPaid(examId, amount, paymentMethod);
  }

  // --- Vue élève (P8–P11) : l'identifiant vient du jeton ---

  /** P8 : sans les notes privées de l'instructeur. */
  async getOwnProfile(userId: string, schoolId: string): Promise<Omit<StudentProfile, 'notes'>> {
    const { notes, ...profile } = await this.requireProfile(userId, schoolId);
    return profile;
  }

  getOwnLessons(userId: string, schoolId: string): Promise<LessonHistory[]> {
    return this.profileRepository.getStudentLessons(userId, schoolId);
  }

  getOwnExams(userId: string, schoolId: string): Promise<ExamHistory[]> {
    return this.profileRepository.getStudentExams(userId, schoolId);
  }

  getOwnFinancialSummary(userId: string, schoolId: string): Promise<FinancialSummary> {
    return this.profileRepository.getFinancialSummary(userId, schoolId);
  }

  private async requireProfile(userId: string, schoolId: string): Promise<StudentProfile> {
    const profile = await this.profileRepository.getStudentProfile(userId, schoolId);
    if (!profile) {
      throw new HttpError(404, 'NOT_FOUND', 'Fiche élève introuvable pour cette école');
    }
    return profile;
  }
}
