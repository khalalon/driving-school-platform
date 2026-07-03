import { EnrollmentService } from '../enrollment.service';
import { IEnrollmentRepository } from '../../repositories/enrollment.repository';
import { IStudentRepository } from '../../repositories/student.repository';
import { ISchoolRepository } from '../../repositories/school.repository';
import { Enrollment, CreateEnrollmentRequestDTO, EnrollmentStatus } from '../../types';

describe('EnrollmentService', () => {
  let enrollmentService: EnrollmentService;
  let mockEnrollmentRepository: jest.Mocked<IEnrollmentRepository>;
  let mockStudentRepository: jest.Mocked<IStudentRepository>;
  let mockSchoolRepository: jest.Mocked<ISchoolRepository>;

  const mockEnrollment: Enrollment = {
    id: 'enrollment-123',
    studentId: 'student-123',
    schoolId: 'school-123',
    status: 'pending' as EnrollmentStatus,
    requestDate: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    mockEnrollmentRepository = {
      findById: jest.fn(),
      findByStudentId: jest.fn(),
      findBySchoolId: jest.fn(),
      findPendingBySchoolId: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateStatus: jest.fn(),
      delete: jest.fn(),
    };

    mockStudentRepository = {
      findById: jest.fn(),
      findByUserId: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    };

    mockSchoolRepository = {
      findById: jest.fn(),
      findAll: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    enrollmentService = new EnrollmentService(
      mockEnrollmentRepository,
      mockStudentRepository,
      mockSchoolRepository
    );
  });

  describe('createEnrollmentRequest', () => {
    it('should create a new enrollment request', async () => {
      const createDto: CreateEnrollmentRequestDTO = {
        studentId: 'student-123',
        schoolId: 'school-123',
      };

      mockStudentRepository.findById.mockResolvedValue({ id: 'student-123' } as any);
      mockSchoolRepository.findById.mockResolvedValue({ id: 'school-123' } as any);
      mockEnrollmentRepository.create.mockResolvedValue(mockEnrollment);

      const result = await enrollmentService.createEnrollmentRequest(createDto);

      expect(mockStudentRepository.findById).toHaveBeenCalledWith('student-123');
      expect(mockSchoolRepository.findById).toHaveBeenCalledWith('school-123');
      expect(mockEnrollmentRepository.create).toHaveBeenCalledWith({
        studentId: createDto.studentId,
        schoolId: createDto.schoolId,
        status: 'pending',
      });
      expect(result).toEqual(mockEnrollment);
    });

    it('should throw error if student not found', async () => {
      const createDto: CreateEnrollmentRequestDTO = {
        studentId: 'non-existent',
        schoolId: 'school-123',
      };

      mockStudentRepository.findById.mockResolvedValue(null);

      await expect(enrollmentService.createEnrollmentRequest(createDto))
        .rejects.toThrow('Student not found');
    });

    it('should throw error if school not found', async () => {
      const createDto: CreateEnrollmentRequestDTO = {
        studentId: 'student-123',
        schoolId: 'non-existent',
      };

      mockStudentRepository.findById.mockResolvedValue({ id: 'student-123' } as any);
      mockSchoolRepository.findById.mockResolvedValue(null);

      await expect(enrollmentService.createEnrollmentRequest(createDto))
        .rejects.toThrow('School not found');
    });

    it('should prevent duplicate enrollment requests', async () => {
      const createDto: CreateEnrollmentRequestDTO = {
        studentId: 'student-123',
        schoolId: 'school-123',
      };

      mockStudentRepository.findById.mockResolvedValue({ id: 'student-123' } as any);
      mockSchoolRepository.findById.mockResolvedValue({ id: 'school-123' } as any);
      mockEnrollmentRepository.create.mockRejectedValue(new Error('Enrollment already exists'));

      await expect(enrollmentService.createEnrollmentRequest(createDto))
        .rejects.toThrow();
    });
  });

  describe('approveEnrollment', () => {
    it('should approve an enrollment request', async () => {
      mockEnrollmentRepository.findById.mockResolvedValue(mockEnrollment);
      mockEnrollmentRepository.updateStatus.mockResolvedValue({
        ...mockEnrollment,
        status: 'approved',
      });

      const result = await enrollmentService.approveEnrollment('enrollment-123');

      expect(mockEnrollmentRepository.updateStatus).toHaveBeenCalledWith(
        'enrollment-123',
        'approved'
      );
      expect(result.status).toBe('approved');
    });

    it('should throw error for non-existent enrollment', async () => {
      mockEnrollmentRepository.findById.mockResolvedValue(null);

      await expect(enrollmentService.approveEnrollment('non-existent'))
        .rejects.toThrow('Enrollment not found');
    });

    it('should not approve already approved enrollments', async () => {
      const approvedEnrollment = { ...mockEnrollment, status: 'approved' };
      mockEnrollmentRepository.findById.mockResolvedValue(approvedEnrollment);

      await expect(enrollmentService.approveEnrollment('enrollment-123'))
        .rejects.toThrow('Enrollment already approved');
    });
  });

  describe('rejectEnrollment', () => {
    it('should reject an enrollment request', async () => {
      mockEnrollmentRepository.findById.mockResolvedValue(mockEnrollment);
      mockEnrollmentRepository.updateStatus.mockResolvedValue({
        ...mockEnrollment,
        status: 'rejected',
      });

      const result = await enrollmentService.rejectEnrollment('enrollment-123');

      expect(mockEnrollmentRepository.updateStatus).toHaveBeenCalledWith(
        'enrollment-123',
        'rejected'
      );
      expect(result.status).toBe('rejected');
    });
  });

  describe('getStudentEnrollments', () => {
    it('should return all student enrollments', async () => {
      const mockEnrollments = [mockEnrollment];
      mockEnrollmentRepository.findByStudentId.mockResolvedValue(mockEnrollments);

      const result = await enrollmentService.getStudentEnrollments('student-123');

      expect(mockEnrollmentRepository.findByStudentId).toHaveBeenCalledWith('student-123');
      expect(result).toEqual(mockEnrollments);
    });

    it('should return empty array if no enrollments', async () => {
      mockEnrollmentRepository.findByStudentId.mockResolvedValue([]);

      const result = await enrollmentService.getStudentEnrollments('student-123');

      expect(result).toEqual([]);
    });
  });

  describe('getSchoolEnrollments', () => {
    it('should return all school enrollments', async () => {
      const mockEnrollments = [mockEnrollment];
      mockEnrollmentRepository.findBySchoolId.mockResolvedValue(mockEnrollments);

      const result = await enrollmentService.getSchoolEnrollments('school-123');

      expect(mockEnrollmentRepository.findBySchoolId).toHaveBeenCalledWith('school-123');
      expect(result).toEqual(mockEnrollments);
    });
  });

  describe('getPendingEnrollments', () => {
    it('should return pending enrollment requests', async () => {
      const mockEnrollments = [mockEnrollment];
      mockEnrollmentRepository.findPendingBySchoolId.mockResolvedValue(mockEnrollments);

      const result = await enrollmentService.getPendingEnrollments('school-123');

      expect(mockEnrollmentRepository.findPendingBySchoolId).toHaveBeenCalledWith('school-123');
      expect(result).toEqual(mockEnrollments);
    });
  });

  describe('cancelEnrollment', () => {
    it('should cancel an enrollment', async () => {
      mockEnrollmentRepository.findById.mockResolvedValue(mockEnrollment);
      mockEnrollmentRepository.updateStatus.mockResolvedValue({
        ...mockEnrollment,
        status: 'cancelled',
      });

      const result = await enrollmentService.cancelEnrollment('enrollment-123');

      expect(result.status).toBe('cancelled');
    });

    it('should not cancel completed enrollments', async () => {
      const completedEnrollment = { ...mockEnrollment, status: 'completed' };
      mockEnrollmentRepository.findById.mockResolvedValue(completedEnrollment);

      await expect(enrollmentService.cancelEnrollment('enrollment-123'))
        .rejects.toThrow('Cannot cancel completed enrollment');
    });
  });

  describe('checkEnrollmentEligibility', () => {
    it('should check if student is eligible for enrollment', async () => {
      const mockStudent = {
        id: 'student-123',
        completedLessons: 10,
        passedExams: 1,
      };

      mockStudentRepository.findById.mockResolvedValue(mockStudent as any);

      const result = await enrollmentService.checkEnrollmentEligibility('student-123');

      expect(result.eligible).toBe(true);
      expect(mockStudentRepository.findById).toHaveBeenCalledWith('student-123');
    });

    it('should return not eligible if requirements not met', async () => {
      const mockStudent = {
        id: 'student-123',
        completedLessons: 0,
        passedExams: 0,
      };

      mockStudentRepository.findById.mockResolvedValue(mockStudent as any);

      const result = await enrollmentService.checkEnrollmentEligibility('student-123');

      expect(result.eligible).toBe(false);
    });
  });
});
