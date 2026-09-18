import { HttpError } from '../../../http/errors';
import { IExamRepository } from '../repositories/exam.repository';
import { CreateExamDTO, Exam, ExamFilters, UpdateExamDTO } from '../types/exam.types';

/** Sessions d'examen, état actuel (créées par l'école). Modèle « demande d'élève » en 3.4 / 5.5. */
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
    if ((await this.examRepository.countRegistrations(id)) > 0) {
      throw new HttpError(409, 'CONFLICT', 'Impossible de supprimer un examen qui a des inscrits');
    }
    await this.examRepository.delete(id);
  }

  async checkAvailability(examId: string): Promise<boolean> {
    const exam = await this.getExamById(examId);
    if (!exam.capacity) {
      return true;
    }
    return (await this.examRepository.countRegistrations(examId)) < exam.capacity;
  }

  private assertFuture(date: Date): void {
    if (date.getTime() < Date.now()) {
      throw new HttpError(400, 'VALIDATION_ERROR', "La date de l'examen doit être dans le futur");
    }
  }
}
