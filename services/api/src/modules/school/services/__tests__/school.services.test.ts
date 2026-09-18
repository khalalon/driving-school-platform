import { LessonType } from '../../../../types/domain';
import { IInstructorRepository } from '../../repositories/instructor.repository';
import { IPricingRepository } from '../../repositories/pricing.repository';
import { ISchoolRepository } from '../../repositories/school.repository';
import { Instructor, Pricing, School } from '../../types/school.types';
import { InstructorService } from '../instructor.service';
import { PricingService } from '../pricing.service';
import { SchoolService } from '../school.service';

const now = new Date('2026-09-18T10:00:00Z');
const school: School = {
  id: 'school-1',
  name: 'Seed Driving School',
  address: '1 rue du Test',
  phone: '+21600000000',
  email: 'contact@seed.io',
  logoUrl: null,
  createdAt: now,
  updatedAt: now,
};
const instructor: Instructor = {
  id: 'instr-1',
  schoolId: 'school-1',
  userId: 'user-instr',
  name: 'Seed Instructor',
  phone: '+21600000001',
  licenseNumber: 'LIC-SEED-001',
  specialties: ['Parc'],
  createdAt: now,
  updatedAt: now,
};
const pricing: Pricing = {
  id: 'pricing-1',
  schoolId: 'school-1',
  lessonType: LessonType.PARC,
  price: 40,
  duration: 60,
  createdAt: now,
  updatedAt: now,
};

describe('SchoolService', () => {
  let repository: jest.Mocked<ISchoolRepository>;
  let service: SchoolService;

  beforeEach(() => {
    repository = {
      create: jest.fn(),
      findById: jest.fn(),
      findAll: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };
    service = new SchoolService(repository);
  });

  it('getSchoolById : 404 NOT_FOUND « École introuvable »', async () => {
    repository.findById.mockResolvedValue(null);

    await expect(service.getSchoolById('ghost')).rejects.toMatchObject({
      status: 404,
      message: 'École introuvable',
    });
  });

  it('updateSchool / deleteSchool : vérifient l’existence avant d’écrire', async () => {
    repository.findById.mockResolvedValue(null);

    await expect(service.updateSchool('ghost', { name: 'X' })).rejects.toMatchObject({
      status: 404,
    });
    await expect(service.deleteSchool('ghost')).rejects.toMatchObject({ status: 404 });
    expect(repository.update).not.toHaveBeenCalled();
    expect(repository.delete).not.toHaveBeenCalled();

    repository.findById.mockResolvedValue(school);
    repository.update.mockResolvedValue({ ...school, name: 'Nouvelle' });
    await expect(service.updateSchool('school-1', { name: 'Nouvelle' })).resolves.toMatchObject({
      name: 'Nouvelle',
    });
    await service.deleteSchool('school-1');
    expect(repository.delete).toHaveBeenCalledWith('school-1');
  });

  it('createSchool / getAllSchools délèguent', async () => {
    repository.create.mockResolvedValue(school);
    repository.findAll.mockResolvedValue([school]);

    await expect(
      service.createSchool({
        name: school.name,
        address: school.address,
        phone: school.phone,
        email: school.email,
      })
    ).resolves.toEqual(school);
    await expect(service.getAllSchools()).resolves.toEqual([school]);
  });
});

describe('InstructorService', () => {
  let repository: jest.Mocked<IInstructorRepository>;
  let service: InstructorService;

  beforeEach(() => {
    repository = {
      create: jest.fn(),
      findById: jest.fn(),
      findBySchoolId: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };
    service = new InstructorService(repository);
  });

  it('404 NOT_FOUND « Instructeur introuvable » sur lecture, mise à jour et suppression', async () => {
    repository.findById.mockResolvedValue(null);

    await expect(service.getInstructorById('ghost')).rejects.toMatchObject({
      status: 404,
      message: 'Instructeur introuvable',
    });
    await expect(service.updateInstructor('ghost', { phone: '+216' })).rejects.toMatchObject({
      status: 404,
    });
    await expect(service.deleteInstructor('ghost')).rejects.toMatchObject({ status: 404 });
  });

  it('flux nominal : ajout, liste par école, mise à jour, suppression', async () => {
    repository.create.mockResolvedValue(instructor);
    repository.findBySchoolId.mockResolvedValue([instructor]);
    repository.findById.mockResolvedValue(instructor);
    repository.update.mockResolvedValue({ ...instructor, phone: '+21699999999' });

    await expect(
      service.addInstructor('school-1', {
        userId: 'user-instr',
        name: 'Seed Instructor',
        phone: '+21600000001',
        licenseNumber: 'LIC-SEED-001',
        specialties: ['Parc'],
      })
    ).resolves.toEqual(instructor);
    await expect(service.getInstructorsBySchool('school-1')).resolves.toEqual([instructor]);
    await expect(
      service.updateInstructor('instr-1', { phone: '+21699999999' })
    ).resolves.toMatchObject({ phone: '+21699999999' });
    await service.deleteInstructor('instr-1');
    expect(repository.delete).toHaveBeenCalledWith('instr-1');
  });
});

describe('PricingService', () => {
  let repository: jest.Mocked<IPricingRepository>;
  let service: PricingService;

  beforeEach(() => {
    repository = {
      setPricing: jest.fn(),
      findBySchoolId: jest.fn(),
      findBySchoolAndType: jest.fn(),
      delete: jest.fn(),
    };
    service = new PricingService(repository);
  });

  it('setPricing (upsert), liste, tarif par type, suppression', async () => {
    repository.setPricing.mockResolvedValue(pricing);
    repository.findBySchoolId.mockResolvedValue([pricing]);
    repository.findBySchoolAndType.mockResolvedValue(pricing);

    await expect(
      service.setPricing('school-1', { lessonType: LessonType.PARC, price: 40, duration: 60 })
    ).resolves.toEqual(pricing);
    await expect(service.getPricingBySchool('school-1')).resolves.toEqual([pricing]);
    await expect(service.getPricingByType('school-1', LessonType.PARC)).resolves.toEqual(pricing);
    await service.deletePricing('pricing-1');
    expect(repository.delete).toHaveBeenCalledWith('pricing-1');
  });

  it('getPricingByType : null quand l’école n’a pas de tarif pour ce type (D-30)', async () => {
    repository.findBySchoolAndType.mockResolvedValue(null);

    await expect(service.getPricingByType('school-1', LessonType.CODE)).resolves.toBeNull();
  });
});
