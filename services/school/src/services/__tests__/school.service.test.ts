import { SchoolService } from '../school.service';
import { ISchoolRepository } from '../../repositories/school.repository';
import { School, CreateSchoolDTO } from '../../types';

describe('SchoolService', () => {
  let schoolService: SchoolService;
  let mockSchoolRepository: jest.Mocked<ISchoolRepository>;

  const mockSchool: School = {
    id: 'school-123',
    name: 'Test Driving School',
    address: '123 Main St',
    phone: '123-456-7890',
    email: 'test@school.com',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    mockSchoolRepository = {
      findAll: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findByName: jest.fn(),
    };

    schoolService = new SchoolService(mockSchoolRepository);
  });

  describe('getAllSchools', () => {
    it('should return all schools', async () => {
      const mockSchools = [mockSchool];
      mockSchoolRepository.findAll.mockResolvedValue(mockSchools);

      const result = await schoolService.getAllSchools();

      expect(mockSchoolRepository.findAll).toHaveBeenCalled();
      expect(result).toEqual(mockSchools);
    });

    it('should handle empty results', async () => {
      mockSchoolRepository.findAll.mockResolvedValue([]);

      const result = await schoolService.getAllSchools();

      expect(result).toEqual([]);
    });
  });

  describe('getSchoolById', () => {
    it('should return school by id', async () => {
      mockSchoolRepository.findById.mockResolvedValue(mockSchool);

      const result = await schoolService.getSchoolById('school-123');

      expect(mockSchoolRepository.findById).toHaveBeenCalledWith('school-123');
      expect(result).toEqual(mockSchool);
    });

    it('should throw error if school not found', async () => {
      mockSchoolRepository.findById.mockResolvedValue(null);

      await expect(schoolService.getSchoolById('non-existent')).rejects.toThrow('School not found');
    });
  });

  describe('createSchool', () => {
    it('should create a new school', async () => {
      const createSchoolDto: CreateSchoolDTO = {
        name: 'New Driving School',
        address: '456 Oak Ave',
        phone: '987-654-3210',
        email: 'new@school.com',
      };

      mockSchoolRepository.create.mockResolvedValue(mockSchool);

      const result = await schoolService.createSchool(createSchoolDto);

      expect(mockSchoolRepository.create).toHaveBeenCalledWith(
        createSchoolDto.name,
        createSchoolDto.address,
        createSchoolDto.phone,
        createSchoolDto.email
      );
      expect(result).toEqual(mockSchool);
    });

    it('should handle duplicate school names', async () => {
      const createSchoolDto: CreateSchoolDTO = {
        name: 'Existing School',
        address: '123 Main St',
        phone: '123-456-7890',
        email: 'existing@school.com',
      };

      mockSchoolRepository.findByName.mockResolvedValue(mockSchool);

      await expect(schoolService.createSchool(createSchoolDto)).rejects.toThrow('School already exists');
    });
  });

  describe('updateSchool', () => {
    it('should update an existing school', async () => {
      const updateData = {
        name: 'Updated School Name',
      };

      const updatedSchool = { ...mockSchool, ...updateData };
      mockSchoolRepository.findById.mockResolvedValue(mockSchool);
      mockSchoolRepository.update.mockResolvedValue(updatedSchool);

      const result = await schoolService.updateSchool('school-123', updateData);

      expect(mockSchoolRepository.update).toHaveBeenCalledWith('school-123', updateData);
      expect(result).toEqual(updatedSchool);
    });

    it('should throw error when updating non-existent school', async () => {
      mockSchoolRepository.findById.mockResolvedValue(null);

      await expect(schoolService.updateSchool('non-existent', { name: 'New Name' }))
        .rejects.toThrow('School not found');
    });
  });

  describe('deleteSchool', () => {
    it('should delete a school', async () => {
      mockSchoolRepository.findById.mockResolvedValue(mockSchool);
      mockSchoolRepository.delete.mockResolvedValue(undefined);

      await schoolService.deleteSchool('school-123');

      expect(mockSchoolRepository.delete).toHaveBeenCalledWith('school-123');
    });

    it('should throw error when deleting non-existent school', async () => {
      mockSchoolRepository.findById.mockResolvedValue(null);

      await expect(schoolService.deleteSchool('non-existent')).rejects.toThrow('School not found');
    });
  });
});
