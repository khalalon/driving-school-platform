import { IExamRepository } from '../repositories/exam.repository';
import { Exam, CreateExamDTO, UpdateExamDTO, ExamFilters } from '../types';
import { isBefore } from 'date-fns';

export class ExamService {
  constructor(private readonly examRepository: IExamRepository) {}

  async createExam(dto: CreateExamDTO): Promise<Exam> {
    if (isBefore(dto.dateTime, new Date())) {
      throw new Error('Exam date must be in the future');
    }

    if (dto.price <= 0) {
      throw new Error('Price must be greater than 0');
    }

    if (dto.capacity !== undefined && dto.capacity < 1) {
      throw new Error('Capacity must be at least 1');
    }

    return this.examRepository.create(dto);
  }

  async getExamById(id: string): Promise<Exam> {
    const exam = await this.examRepository.findById(id);
    if (!exam) {
      throw new Error('Exam not found');
    }
    return exam;
  }

  async getExams(filters: ExamFilters): Promise<Exam[]> {
    return this.examRepository.findAll(filters);
  }

  async updateExam(id: string, dto: UpdateExamDTO): Promise<Exam> {
    const exam = await this.examRepository.findById(id);
    if (!exam) {
      throw new Error('Exam not found');
    }

    if (dto.dateTime && isBefore(dto.dateTime, new Date())) {
      throw new Error('Exam date must be in the future');
    }

    return this.examRepository.update(id, dto);
  }

  async deleteExam(id: string): Promise<void> {
    const exam = await this.examRepository.findById(id);
    if (!exam) {
      throw new Error('Exam not found');
    }

    const registrationCount = await this.examRepository.countRegistrations(id);
    if (registrationCount > 0) {
      throw new Error('Cannot delete exam with registrations');
    }

    await this.examRepository.delete(id);
  }

  async checkAvailability(examId: string): Promise<boolean> {
    const exam = await this.examRepository.findById(examId);
    if (!exam) {
      throw new Error('Exam not found');
    }

    if (!exam.capacity) {
      return true; // No capacity limit
    }

    const registrationCount = await this.examRepository.countRegistrations(examId);
    return registrationCount < exam.capacity;
  }
}
