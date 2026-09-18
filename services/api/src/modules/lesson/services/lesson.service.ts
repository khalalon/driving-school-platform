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
 * Créneaux de leçon, état actuel (modèle « l'école crée, l'élève réserve »). Réécrit selon D-01 /
 * D-21 en 3.3 et 5.2–5.4 : la leçon naîtra d'une demande de l'élève.
 */
export class LessonService {
  constructor(private readonly lessonRepository: ILessonRepository) {}

  async createLesson(dto: CreateLessonDTO): Promise<Lesson> {
    this.assertFuture(dto.dateTime);
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
    if (dto.dateTime) {
      this.assertFuture(dto.dateTime);
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
