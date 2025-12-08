import { ILessonRepository } from '../repositories/lesson.repository';
import { Lesson, CreateLessonDTO, UpdateLessonDTO, LessonFilters, LessonStatus } from '../types';
import { isBefore } from 'date-fns';

export class LessonService {
  constructor(private readonly lessonRepository: ILessonRepository) {}

  async createLesson(dto: CreateLessonDTO): Promise<Lesson> {
    if (isBefore(dto.dateTime, new Date())) {
      throw new Error('Lesson date must be in the future');
    }

    if (dto.capacity < 1) {
      throw new Error('Capacity must be at least 1');
    }

    if (dto.durationMinutes < 1) {
      throw new Error('Duration must be at least 1 minute');
    }

    return this.lessonRepository.create(dto);
  }

  async getLessonById(id: string): Promise<Lesson> {
    const lesson = await this.lessonRepository.findById(id);
    if (!lesson) {
      throw new Error('Lesson not found');
    }
    return lesson;
  }

  async getLessons(filters: LessonFilters): Promise<Lesson[]> {
    return this.lessonRepository.findAll(filters);
  }

  async updateLesson(id: string, dto: UpdateLessonDTO): Promise<Lesson> {
    const lesson = await this.lessonRepository.findById(id);
    if (!lesson) {
      throw new Error('Lesson not found');
    }

    if (lesson.status !== LessonStatus.SCHEDULED) {
      throw new Error('Cannot update non-scheduled lesson');
    }

    if (dto.dateTime && isBefore(dto.dateTime, new Date())) {
      throw new Error('Lesson date must be in the future');
    }

    return this.lessonRepository.update(id, dto);
  }

  async cancelLesson(id: string): Promise<Lesson> {
    const lesson = await this.lessonRepository.findById(id);
    if (!lesson) {
      throw new Error('Lesson not found');
    }

    if (lesson.currentBookings > 0) {
      throw new Error('Cannot cancel lesson with bookings');
    }

    return this.lessonRepository.update(id, { status: LessonStatus.CANCELLED });
  }

  async deleteLesson(id: string): Promise<void> {
    const lesson = await this.lessonRepository.findById(id);
    if (!lesson) {
      throw new Error('Lesson not found');
    }

    if (lesson.currentBookings > 0) {
      throw new Error('Cannot delete lesson with bookings');
    }

    await this.lessonRepository.delete(id);
  }

  async checkAvailability(lessonId: string): Promise<boolean> {
    const lesson = await this.lessonRepository.findById(lessonId);
    if (!lesson) {
      throw new Error('Lesson not found');
    }

    return lesson.currentBookings < lesson.capacity && lesson.status === LessonStatus.SCHEDULED;
  }
}
