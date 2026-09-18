import { HttpError } from '../../../http/errors';
import { IExamRepository } from '../repositories/exam.repository';
import { IRegistrationRepository } from '../repositories/registration.repository';
import {
  ExamEligibility,
  ExamRegistration,
  ExamResult,
  ExamType,
  RecordResultDTO,
} from '../types/exam.types';

/** Ce que l'inscription attend du module student. */
export interface StudentLookup {
  findById(id: string): Promise<{ id: string; authorized: boolean } | null>;
}

/**
 * Inscriptions aux sessions d'examen, état actuel. La règle d'éligibilité (20 / 30 leçons) est
 * supprimée en v1 (D-26) : conservée telle quelle jusqu'à 5.5–5.7.
 */
export class RegistrationService {
  private static readonly REQUIRED_LESSONS: Record<ExamType, number> = {
    [ExamType.THEORY]: 20,
    [ExamType.PRACTICAL]: 30,
  };

  constructor(
    private readonly registrationRepository: IRegistrationRepository,
    private readonly examRepository: IExamRepository,
    private readonly students: StudentLookup
  ) {}

  async registerForExam(examId: string, studentId: string): Promise<ExamRegistration> {
    const exam = await this.examRepository.findById(examId);
    if (!exam) {
      throw new HttpError(404, 'NOT_FOUND', 'Examen introuvable');
    }

    const student = await this.students.findById(studentId);
    if (!student) {
      throw new HttpError(404, 'NOT_FOUND', 'Élève introuvable');
    }
    if (!student.authorized) {
      throw new HttpError(403, 'NOT_ENROLLED', "L'élève n'est pas autorisé à s'inscrire");
    }

    const eligibility = await this.checkEligibility(studentId, exam.type);
    if (!eligibility.eligible) {
      throw new HttpError(403, 'FORBIDDEN', eligibility.reason ?? "L'élève n'est pas éligible");
    }

    const existing = await this.registrationRepository.findByExamAndStudent(examId, studentId);
    if (existing) {
      throw new HttpError(409, 'CONFLICT', 'Cet élève est déjà inscrit à cet examen');
    }

    if (exam.capacity) {
      const count = await this.examRepository.countRegistrations(examId);
      if (count >= exam.capacity) {
        throw new HttpError(409, 'CONFLICT', 'Cet examen est complet');
      }
    }

    return this.registrationRepository.create(examId, studentId);
  }

  async getRegistrationById(id: string): Promise<ExamRegistration> {
    const registration = await this.registrationRepository.findById(id);
    if (!registration) {
      throw new HttpError(404, 'NOT_FOUND', "Inscription à l'examen introuvable");
    }
    return registration;
  }

  getRegistrationsByExam(examId: string): Promise<ExamRegistration[]> {
    return this.registrationRepository.findByExamId(examId);
  }

  getRegistrationsByStudent(studentId: string): Promise<ExamRegistration[]> {
    return this.registrationRepository.findByStudentId(studentId);
  }

  /** Les bornes du score (0–100) sont garanties par le validateur Joi. */
  async recordResult(registrationId: string, dto: RecordResultDTO): Promise<ExamRegistration> {
    await this.getRegistrationById(registrationId);
    return this.registrationRepository.updateResult(registrationId, dto);
  }

  async cancelRegistration(registrationId: string): Promise<void> {
    const registration = await this.getRegistrationById(registrationId);
    if (registration.result !== ExamResult.PENDING) {
      throw new HttpError(
        409,
        'CONFLICT',
        'Impossible d’annuler une inscription dont le résultat est enregistré'
      );
    }
    await this.registrationRepository.delete(registrationId);
  }

  async checkEligibility(studentId: string, examType: ExamType): Promise<ExamEligibility> {
    const completedLessons = await this.registrationRepository.countCompletedLessons(studentId);
    const requiredLessons = RegistrationService.REQUIRED_LESSONS[examType];
    if (completedLessons < requiredLessons) {
      return {
        eligible: false,
        reason: `Il manque ${requiredLessons - completedLessons} leçon(s) effectuée(s)`,
        requiredLessons,
        completedLessons,
      };
    }
    return { eligible: true, requiredLessons, completedLessons };
  }
}
