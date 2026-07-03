import { ExamService } from '../exam.service';
import { IExamRepository } from '../../repositories/exam.repository';
import { Exam, CreateExamDTO } from '../../types';

describe('ExamService', () => {
  let examService: ExamService;
  let mockExamRepository: jest.Mocked<IExamRepository>;

  const mockExam: Exam = {
    id: 'exam-123',
    schoolId: 'school-123',
    title: 'Driving License Exam',
    description: 'Final driving test',
    date: new Date('2024-12-31'),
    maxScore: 100,
    passingScore: 70,
    duration: 60,
    status: 'scheduled',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    mockExamRepository = {
      findAll: jest.fn(),
      findById: jest.fn(),
      findBySchoolId: jest.fn(),
      findByStatus: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      updateStatus: jest.fn(),
    };

    examService = new ExamService(mockExamRepository);
  });

  describe('getAllExams', () => {
    it('should return all exams', async () => {
      const mockExams = [mockExam];
      mockExamRepository.findAll.mockResolvedValue(mockExams);

      const result = await examService.getAllExams();

      expect(mockExamRepository.findAll).toHaveBeenCalled();
      expect(result).toEqual(mockExams);
    });

    it('should return empty array if no exams', async () => {
      mockExamRepository.findAll.mockResolvedValue([]);

      const result = await examService.getAllExams();

      expect(result).toEqual([]);
    });
  });

  describe('getExamById', () => {
    it('should return exam by id', async () => {
      mockExamRepository.findById.mockResolvedValue(mockExam);

      const result = await examService.getExamById('exam-123');

      expect(mockExamRepository.findById).toHaveBeenCalledWith('exam-123');
      expect(result).toEqual(mockExam);
    });

    it('should throw error if exam not found', async () => {
      mockExamRepository.findById.mockResolvedValue(null);

      await expect(examService.getExamById('non-existent')).rejects.toThrow('Exam not found');
    });
  });

  describe('createExam', () => {
    it('should create a new exam', async () => {
      const createExamDto: CreateExamDTO = {
        schoolId: 'school-123',
        title: 'New Exam',
        description: 'Exam description',
        date: new Date('2024-12-31'),
        maxScore: 100,
        passingScore: 70,
        duration: 60,
      };

      mockExamRepository.create.mockResolvedValue(mockExam);

      const result = await examService.createExam(createExamDto);

      expect(mockExamRepository.create).toHaveBeenCalledWith(createExamDto);
      expect(result).toEqual(mockExam);
    });

    it('should validate passing score is less than max score', async () => {
      const invalidExam = {
        schoolId: 'school-123',
        title: 'Invalid Exam',
        maxScore: 70,
        passingScore: 100,  // Invalid: passing score > max score
      };

      await expect(examService.createExam(invalidExam as any))
        .rejects.toThrow();
    });
  });

  describe('updateExam', () => {
    it('should update an existing exam', async () => {
      const updateData = {
        title: 'Updated Exam Title',
        passingScore: 75,
      };

      const updatedExam = { ...mockExam, ...updateData };
      mockExamRepository.findById.mockResolvedValue(mockExam);
      mockExamRepository.update.mockResolvedValue(updatedExam);

      const result = await examService.updateExam('exam-123', updateData);

      expect(mockExamRepository.update).toHaveBeenCalledWith('exam-123', updateData);
      expect(result).toEqual(updatedExam);
    });

    it('should throw error when updating non-existent exam', async () => {
      mockExamRepository.findById.mockResolvedValue(null);

      await expect(examService.updateExam('non-existent', { title: 'New Title' }))
        .rejects.toThrow('Exam not found');
    });
  });

  describe('deleteExam', () => {
    it('should delete an exam', async () => {
      mockExamRepository.findById.mockResolvedValue(mockExam);
      mockExamRepository.delete.mockResolvedValue(undefined);

      await examService.deleteExam('exam-123');

      expect(mockExamRepository.delete).toHaveBeenCalledWith('exam-123');
    });

    it('should throw error when deleting non-existent exam', async () => {
      mockExamRepository.findById.mockResolvedValue(null);

      await expect(examService.deleteExam('non-existent')).rejects.toThrow('Exam not found');
    });
  });

  describe('updateExamStatus', () => {
    it('should update exam status', async () => {
      mockExamRepository.findById.mockResolvedValue(mockExam);
      mockExamRepository.updateStatus.mockResolvedValue({
        ...mockExam,
        status: 'completed',
      });

      const result = await examService.updateExamStatus('exam-123', 'completed');

      expect(mockExamRepository.updateStatus).toHaveBeenCalledWith('exam-123', 'completed');
      expect(result.status).toBe('completed');
    });

    it('should validate exam status', async () => {
      mockExamRepository.findById.mockResolvedValue(mockExam);

      await expect(examService.updateExamStatus('exam-123', 'invalid-status' as any))
        .rejects.toThrow();
    });
  });
});
