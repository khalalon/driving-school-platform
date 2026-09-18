import { HttpError } from '../../../http/errors';
import { ILessonRepository } from '../repositories/lesson.repository';
import {
  CreateLessonDTO,
  Lesson,
  LessonFilters,
  LessonStatus,
  UpdateLessonDTO,
} from '../types/lesson.types';

/**
 * Anciennes routes de créneaux sur le schéma 007 (une leçon = un élève), conservées jusqu'à leur
 * remplacement par L1–L7 (5.2–5.4) : la leçon naîtra d'une demande de l'élève (D-01, D-21).
 */
export class LessonService {
  constructor(private readonly lessonRepository: ILessonRepository) {}

  async createLesson(dto: CreateLessonDTO): Promise<Lesson> {
    this.assertFuture(dto.scheduledDate);
    return await this.lessonRepository.create(dto);
  }

  async getLessonById(id: string): Promise<Lesson> {
    const lesson = await this.lessonRepository.findById(id);
    if (!lesson) {
      throw new HttpError(404, 'NOT_FOUND', 'Leçon introuvable');
    }
    return lesson;
  }

  getLessons(filters: LessonFilters): Promise<Lesson[]> {
    return this.lessonRepository.findAll(filters);
  }

  async updateLesson(id: string, dto: UpdateLessonDTO): Promise<Lesson> {
    const lesson = await this.getLessonById(id);
    if (lesson.status !== LessonStatus.SCHEDULED) {
      throw new HttpError(409, 'CONFLICT', 'Seule une leçon planifiée peut être modifiée');
    }
    if (dto.scheduledDate) {
      this.assertFuture(dto.scheduledDate);
    }
    return this.lessonRepository.update(id, dto);
  }

  async cancelLesson(id: string): Promise<Lesson> {
    const lesson = await this.getLessonById(id);
    if (lesson.currentBookings > 0) {
      throw new HttpError(409, 'CONFLICT', 'Impossible d’annuler une leçon qui a des réservations');
    }
    return this.lessonRepository.update(id, { status: LessonStatus.CANCELLED });
  }

  async deleteLesson(id: string): Promise<void> {
    const lesson = await this.getLessonById(id);
    if (lesson.currentBookings > 0) {
      throw new HttpError(
        409,
        'CONFLICT',
        'Impossible de supprimer une leçon qui a des réservations'
      );
    }
    await this.lessonRepository.delete(id);
  }

  async checkAvailability(lessonId: string): Promise<boolean> {
    const lesson = await this.getLessonById(lessonId);
    return lesson.currentBookings < lesson.capacity && lesson.status === LessonStatus.SCHEDULED;
  }

  private assertFuture(date: Date): void {
    if (date.getTime() < Date.now()) {
      throw new HttpError(400, 'VALIDATION_ERROR', 'La date de la leçon doit être dans le futur');
    }
  }
}
