import { LessonService } from '../lesson.service';
import { ILessonRepository } from '../../repositories/lesson.repository';
import { Lesson, CreateLessonDTO } from '../../types';

describe('LessonService', () => {
  let lessonService: LessonService;
  let mockLessonRepository: jest.Mocked<ILessonRepository>;

  const mockLesson: Lesson = {
    id: 'lesson-123',
    schoolId: 'school-123',
    instructorId: 'instructor-123',
    title: 'Introduction to Driving',
    description: 'Basic driving skills',
    duration: 60,
    price: 50,
    category: 'basic',
    level: 'beginner',
    availableSlots: 5,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    mockLessonRepository = {
      findAll: jest.fn(),
      findById: jest.fn(),
      findBySchoolId: jest.fn(),
      findByInstructorId: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      updateAvailability: jest.fn(),
    };

    lessonService = new LessonService(mockLessonRepository);
  });

  describe('getAllLessons', () => {
    it('should return all lessons', async () => {
      const mockLessons = [mockLesson];
      mockLessonRepository.findAll.mockResolvedValue(mockLessons);

      const result = await lessonService.getAllLessons();

      expect(mockLessonRepository.findAll).toHaveBeenCalled();
      expect(result).toEqual(mockLessons);
    });

    it('should filter lessons by school ID', async () => {
      mockLessonRepository.findBySchoolId.mockResolvedValue([mockLesson]);

      const result = await lessonService.getLessonsBySchool('school-123');

      expect(mockLessonRepository.findBySchoolId).toHaveBeenCalledWith('school-123');
      expect(result).toEqual([mockLesson]);
    });
  });

  describe('getLessonById', () => {
    it('should return lesson by id', async () => {
      mockLessonRepository.findById.mockResolvedValue(mockLesson);

      const result = await lessonService.getLessonById('lesson-123');

      expect(mockLessonRepository.findById).toHaveBeenCalledWith('lesson-123');
      expect(result).toEqual(mockLesson);
    });

    it('should throw error if lesson not found', async () => {
      mockLessonRepository.findById.mockResolvedValue(null);

      await expect(lessonService.getLessonById('non-existent')).rejects.toThrow('Lesson not found');
    });
  });

  describe('createLesson', () => {
    it('should create a new lesson', async () => {
      const createLessonDto: CreateLessonDTO = {
        schoolId: 'school-123',
        instructorId: 'instructor-123',
        title: 'Advanced Driving',
        description: 'Advanced techniques',
        duration: 90,
        price: 75,
        category: 'advanced',
        level: 'advanced',
        availableSlots: 3,
      };

      mockLessonRepository.create.mockResolvedValue(mockLesson);

      const result = await lessonService.createLesson(createLessonDto);

      expect(mockLessonRepository.create).toHaveBeenCalledWith(createLessonDto);
      expect(result).toEqual(mockLesson);
    });

    it('should validate lesson data', async () => {
      const invalidLesson = {
        schoolId: 'school-123',
        title: '',  // Invalid: empty title
        duration: -30,  // Invalid: negative duration
        price: -10,  // Invalid: negative price
      };

      await expect(lessonService.createLesson(invalidLesson as any))
        .rejects.toThrow();
    });
  });

  describe('updateLesson', () => {
    it('should update an existing lesson', async () => {
      const updateData = {
        title: 'Updated Lesson Title',
        price: 65,
      };

      const updatedLesson = { ...mockLesson, ...updateData };
      mockLessonRepository.findById.mockResolvedValue(mockLesson);
      mockLessonRepository.update.mockResolvedValue(updatedLesson);

      const result = await lessonService.updateLesson('lesson-123', updateData);

      expect(mockLessonRepository.update).toHaveBeenCalledWith('lesson-123', updateData);
      expect(result).toEqual(updatedLesson);
    });

    it('should throw error when updating non-existent lesson', async () => {
      mockLessonRepository.findById.mockResolvedValue(null);

      await expect(lessonService.updateLesson('non-existent', { title: 'New Title' }))
        .rejects.toThrow('Lesson not found');
    });
  });

  describe('deleteLesson', () => {
    it('should delete a lesson', async () => {
      mockLessonRepository.findById.mockResolvedValue(mockLesson);
      mockLessonRepository.delete.mockResolvedValue(undefined);

      await lessonService.deleteLesson('lesson-123');

      expect(mockLessonRepository.delete).toHaveBeenCalledWith('lesson-123');
    });

    it('should throw error when deleting non-existent lesson', async () => {
      mockLessonRepository.findById.mockResolvedValue(null);

      await expect(lessonService.deleteLesson('non-existent')).rejects.toThrow('Lesson not found');
    });
  });

  describe('updateAvailability', () => {
    it('should update lesson availability', async () => {
      mockLessonRepository.findById.mockResolvedValue(mockLesson);
      mockLessonRepository.updateAvailability.mockResolvedValue({
        ...mockLesson,
        availableSlots: 4,
      });

      const result = await lessonService.updateAvailability('lesson-123', -1);

      expect(mockLessonRepository.updateAvailability).toHaveBeenCalledWith('lesson-123', -1);
      expect(result.availableSlots).toBe(4);
    });

    it('should prevent negative availability', async () => {
      mockLessonRepository.findById.mockResolvedValue({
        ...mockLesson,
        availableSlots: 0,
      });

      await expect(lessonService.updateAvailability('lesson-123', -1))
        .rejects.toThrow('No available slots');
    });
  });
});
