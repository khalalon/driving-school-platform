import { HttpError } from '../../../http/errors';
import { IProfileRepository } from '../repositories/profile.repository';
import {
  ExamHistory,
  FinancialSummary,
  LessonHistory,
  StudentProfile,
} from '../types/student.types';

/** Fiche élève (P1–P11). Les bornes des payloads (`notes` non vide, `amount` > 0…) sont validées par Joi. */
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

  updateInstructorNotes(studentId: string, notes: string): Promise<void> {
    return this.profileRepository.updateNotes(studentId, notes);
  }

  markLessonPaid(bookingId: string, amount: number, paymentMethod: string): Promise<void> {
    return this.profileRepository.markLessonPaid(bookingId, amount, paymentMethod);
  }

  markExamPaid(registrationId: string, amount: number, paymentMethod: string): Promise<void> {
    return this.profileRepository.markExamPaid(registrationId, amount, paymentMethod);
  }
}
