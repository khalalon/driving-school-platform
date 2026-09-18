import { HttpError } from '../../../http/errors';
import { IExamRepository } from '../repositories/exam.repository';
import { CreateExamDTO, Exam, ExamFilters, UpdateExamDTO } from '../types/exam.types';

/**
 * Anciennes routes de sessions sur le schéma 008 (un examen = un élève), conservées jusqu'à leur
 * remplacement par X1–X5 (5.5–5.6) : l'examen naîtra d'une demande de l'élève (D-01).
 */
export class ExamService {
  constructor(private readonly examRepository: IExamRepository) {}

  async createExam(dto: CreateExamDTO): Promise<Exam> {
    this.assertFuture(dto.dateTime);
    return await this.examRepository.create(dto);
  }

  async getExamById(id: string): Promise<Exam> {
    const exam = await this.examRepository.findById(id);
    if (!exam) {
      throw new HttpError(404, 'NOT_FOUND', 'Examen introuvable');
    }
    return exam;
  }

  getExams(filters: ExamFilters): Promise<Exam[]> {
    return this.examRepository.findAll(filters);
  }

  async updateExam(id: string, dto: UpdateExamDTO): Promise<Exam> {
    await this.getExamById(id);
    if (dto.dateTime) {
      this.assertFuture(dto.dateTime);
    }
    return this.examRepository.update(id, dto);
  }

  async deleteExam(id: string): Promise<void> {
    await this.getExamById(id);
    await this.examRepository.delete(id);
  }

  private assertFuture(date: Date): void {
    if (date.getTime() < Date.now()) {
      throw new HttpError(400, 'VALIDATION_ERROR', "La date de l'examen doit être dans le futur");
    }
  }
}
