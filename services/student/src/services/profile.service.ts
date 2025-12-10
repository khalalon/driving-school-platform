/**
 * Profile Service
 * Single Responsibility: Student profile business logic
 * Dependency Inversion: Depends on IProfileRepository
 */

import { IProfileRepository } from '../repositories/profile.repository';
import {
  StudentProfile,
  LessonHistory,
  ExamHistory,
  FinancialSummary,
} from '../types';

export class ProfileService {
  constructor(private readonly profileRepository: IProfileRepository) {}

  async getCompleteProfile(studentId: string, schoolId: string): Promise<StudentProfile> {
    const profile = await this.profileRepository.getStudentProfile(studentId, schoolId);

    if (!profile) {
      throw new Error('Student profile not found');
    }

    return profile;
  }

  async getStudentLessons(studentId: string, schoolId: string): Promise<LessonHistory[]> {
    return this.profileRepository.getStudentLessons(studentId, schoolId);
  }

  async getStudentExams(studentId: string, schoolId: string): Promise<ExamHistory[]> {
    return this.profileRepository.getStudentExams(studentId, schoolId);
  }

  async getFinancialSummary(studentId: string, schoolId: string): Promise<FinancialSummary> {
    return this.profileRepository.getFinancialSummary(studentId, schoolId);
  }

  async updateInstructorNotes(studentId: string, notes: string): Promise<void> {
    if (!notes || notes.trim().length === 0) {
      throw new Error('Notes cannot be empty');
    }

    await this.profileRepository.updateNotes(studentId, notes);
  }

  async markLessonPaid(bookingId: string, amount: number, paymentMethod: string): Promise<void> {
    if (amount <= 0) {
      throw new Error('Amount must be greater than 0');
    }

    if (!paymentMethod) {
      throw new Error('Payment method is required');
    }

    await this.profileRepository.markLessonPaid(bookingId, amount, paymentMethod);
  }

  async markExamPaid(registrationId: string, amount: number, paymentMethod: string): Promise<void> {
    if (amount <= 0) {
      throw new Error('Amount must be greater than 0');
    }

    if (!paymentMethod) {
      throw new Error('Payment method is required');
    }

    await this.profileRepository.markExamPaid(registrationId, amount, paymentMethod);
  }
}