import { IRegistrationRepository } from '../repositories/registration.repository';
import { IExamRepository } from '../repositories/exam.repository';
import { IStudentRepository } from '../repositories/student.repository';
import { ExamRegistration, RecordResultDTO, ExamEligibility, ExamType } from '../types';

export class RegistrationService {
  private readonly REQUIRED_LESSONS_THEORY = 20;
  private readonly REQUIRED_LESSONS_PRACTICAL = 30;

  constructor(
    private readonly registrationRepository: IRegistrationRepository,
    private readonly examRepository: IExamRepository,
    private readonly studentRepository: IStudentRepository
  ) {}

  async registerForExam(examId: string, studentId: string): Promise<ExamRegistration> {
    const exam = await this.examRepository.findById(examId);
    if (!exam) {
      throw new Error('Exam not found');
    }

    const student = await this.studentRepository.findById(studentId);
    if (!student) {
      throw new Error('Student not found');
    }

    if (!student.authorized) {
      throw new Error('Student is not authorized');
    }

    // Check eligibility
    const eligibility = await this.checkEligibility(studentId, exam.type);
    if (!eligibility.eligible) {
      throw new Error(eligibility.reason || 'Student is not eligible');
    }

    // Check if already registered
    const existingReg = await this.registrationRepository.findByExamAndStudent(examId, studentId);
    if (existingReg) {
      throw new Error('Student already registered for this exam');
    }

    // Check capacity
    if (exam.capacity) {
      const registrationCount = await this.examRepository.countRegistrations(examId);
      if (registrationCount >= exam.capacity) {
        throw new Error('Exam is full');
      }
    }

    return this.registrationRepository.create(examId, studentId);
  }

  async getRegistrationById(id: string): Promise<ExamRegistration> {
    const registration = await this.registrationRepository.findById(id);
    if (!registration) {
      throw new Error('Registration not found');
    }
    return registration;
  }

  async getRegistrationsByExam(examId: string): Promise<ExamRegistration[]> {
    return this.registrationRepository.findByExamId(examId);
  }

  async getRegistrationsByStudent(studentId: string): Promise<ExamRegistration[]> {
    return this.registrationRepository.findByStudentId(studentId);
  }

  async recordResult(registrationId: string, dto: RecordResultDTO): Promise<ExamRegistration> {
    const registration = await this.registrationRepository.findById(registrationId);
    if (!registration) {
      throw new Error('Registration not found');
    }

    if (dto.score !== undefined && (dto.score < 0 || dto.score > 100)) {
      throw new Error('Score must be between 0 and 100');
    }

    return this.registrationRepository.updateResult(registrationId, dto);
  }

  async cancelRegistration(registrationId: string): Promise<void> {
    const registration = await this.registrationRepository.findById(registrationId);
    if (!registration) {
      throw new Error('Registration not found');
    }

    if (registration.result !== 'pending') {
      throw new Error('Cannot cancel registration with recorded result');
    }

    await this.registrationRepository.delete(registrationId);
  }

  async checkEligibility(studentId: string, examType: ExamType): Promise<ExamEligibility> {
    const completedLessons = await this.registrationRepository.countCompletedLessons(studentId);
    const requiredLessons =
      examType === ExamType.THEORY ? this.REQUIRED_LESSONS_THEORY : this.REQUIRED_LESSONS_PRACTICAL;

    if (completedLessons < requiredLessons) {
      return {
        eligible: false,
        reason: `Student needs ${requiredLessons - completedLessons} more completed lessons`,
        requiredLessons,
        completedLessons,
      };
    }

    return {
      eligible: true,
      requiredLessons,
      completedLessons,
    };
  }
}
