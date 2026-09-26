import { SchoolGuard } from '../../../../http/authz';
import { AuthUser, UserRole } from '../../../../types/auth';
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
  currency: 'TND',
  createdAt: now,
  updatedAt: now,
};
const instructor: Instructor = {
  id: 'instr-1',
  schoolId: 'school-1',
  userId: 'user-instr',
  firstName: 'Seed',
  lastName: 'Instructor',
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
  const roster = { listSchoolRoster: jest.fn() };
  const instructorLookup = { findByUserId: jest.fn() };
  const instructor: AuthUser = { userId: 'user-instr', email: 'i@x.io', role: UserRole.INSTRUCTOR };
  const admin: AuthUser = { userId: 'user-admin', email: 'a@x.io', role: UserRole.ADMIN };

  beforeEach(() => {
    repository = {
      create: jest.fn(),
      findById: jest.fn(),
      findAll: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };
    roster.listSchoolRoster.mockReset();
    instructorLookup.findByUserId.mockReset();
    instructorLookup.findByUserId.mockResolvedValue({ id: 'instr-1', schoolId: 'school-1' });
    service = new SchoolService(repository, roster, new SchoolGuard(instructorLookup));
  });

  it('S6 getSchoolStudents : élèves autorisés de l’école pour son instructeur ou un admin (D-25)', async () => {
    repository.findById.mockResolvedValue(school);
    const row = { studentId: 'user-1', firstName: 'Élève', lastName: 'Test', completedLessons: 2 };
    roster.listSchoolRoster.mockResolvedValue([row]);

    await expect(service.getSchoolStudents(instructor, 'school-1')).resolves.toEqual([row]);
    await expect(service.getSchoolStudents(admin, 'school-1')).resolves.toEqual([row]);
    expect(roster.listSchoolRoster).toHaveBeenCalledWith('school-1');
  });

  it('S6 : 403 FORBIDDEN_SCHOOL pour un instructeur d’une autre école, 404 école inconnue (D-20)', async () => {
    await expect(service.getSchoolStudents(instructor, 'school-2')).rejects.toMatchObject({
      status: 403,
      code: 'FORBIDDEN_SCHOOL',
    });
    expect(roster.listSchoolRoster).not.toHaveBeenCalled();

    repository.findById.mockResolvedValue(null);
    await expect(service.getSchoolStudents(admin, 'ghost')).rejects.toMatchObject({ status: 404 });
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

    await expect(service.updateSchool(admin, 'ghost', { name: 'X' })).rejects.toMatchObject({
      status: 404,
    });
    await expect(service.deleteSchool('ghost')).rejects.toMatchObject({ status: 404 });
    expect(repository.update).not.toHaveBeenCalled();
    expect(repository.delete).not.toHaveBeenCalled();

    repository.findById.mockResolvedValue(school);
    repository.update.mockResolvedValue({ ...school, name: 'Nouvelle' });
    await expect(
      service.updateSchool(admin, 'school-1', { name: 'Nouvelle' })
    ).resolves.toMatchObject({ name: 'Nouvelle' });
    await service.deleteSchool('school-1');
    expect(repository.delete).toHaveBeenCalledWith('school-1');
  });

  it('updateSchool : un instructeur d’une autre école est refusé (D-51, D-20)', async () => {
    repository.findById.mockResolvedValue(school);
    // `instructorLookup` rattache l'instructeur de test à `school-1` : une autre école → 403
    await expect(
      service.updateSchool(instructor, 'school-2', { name: 'Nouvelle' })
    ).rejects.toMatchObject({ status: 403, code: 'FORBIDDEN_SCHOOL' });
    expect(repository.update).not.toHaveBeenCalled();
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
      findByUserId: jest.fn(),
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
  let guard: jest.Mocked<SchoolGuard>;

  /** Instructeur de `school-1` ; le garde refuse toute autre école (D-20). */
  const instructor = {
    userId: 'user-instr',
    email: 'i@x.io',
    role: UserRole.INSTRUCTOR,
  } as AuthUser;

  beforeEach(() => {
    repository = {
      setPricing: jest.fn(),
      findBySchoolId: jest.fn(),
      findBySchoolAndType: jest.fn(),
      findById: jest.fn(),
      delete: jest.fn(),
    };
    guard = {
      assertSameSchool: jest.fn(),
      requireSchool: jest.fn(),
    } as unknown as jest.Mocked<SchoolGuard>;
    service = new PricingService(repository, guard);
  });

  it('setPricing (upsert), liste, tarif par type, suppression', async () => {
    repository.setPricing.mockResolvedValue(pricing);
    repository.findBySchoolId.mockResolvedValue([pricing]);
    repository.findBySchoolAndType.mockResolvedValue(pricing);
    repository.findById.mockResolvedValue(pricing);

    await expect(
      service.setPricing(instructor, 'school-1', {
        lessonType: LessonType.PARC,
        price: 40,
        duration: 60,
      })
    ).resolves.toEqual(pricing);
    await expect(service.getPricingBySchool('school-1')).resolves.toEqual([pricing]);
    await expect(service.getPricingByType('school-1', LessonType.PARC)).resolves.toEqual(pricing);
    await service.deletePricing(instructor, 'pricing-1');
    expect(repository.delete).toHaveBeenCalledWith('pricing-1');
  });

  it('setPricing : cloisonné à l’école de l’instructeur (D-51, D-20)', async () => {
    await service
      .setPricing(instructor, 'school-1', {
        lessonType: LessonType.PARC,
        price: 40,
        duration: 60,
      })
      .catch(() => undefined);

    expect(guard.assertSameSchool).toHaveBeenCalledWith(instructor, 'school-1');
  });

  it('deletePricing : le tarif désigne son école, contrôlée avant la suppression', async () => {
    repository.findById.mockResolvedValue({ ...pricing, schoolId: 'school-2' });

    await service.deletePricing(instructor, 'pricing-1');

    expect(guard.assertSameSchool).toHaveBeenCalledWith(instructor, 'school-2');
    expect(repository.delete).toHaveBeenCalledWith('pricing-1');
  });

  it('deletePricing : 404 sur un tarif inconnu, sans suppression', async () => {
    repository.findById.mockResolvedValue(null);

    await expect(service.deletePricing(instructor, 'fantome')).rejects.toMatchObject({
      status: 404,
      code: 'NOT_FOUND',
    });
    expect(repository.delete).not.toHaveBeenCalled();
  });

  it('getPricingByType : null quand l’école n’a pas de tarif pour ce type (D-30)', async () => {
    repository.findBySchoolAndType.mockResolvedValue(null);

    await expect(service.getPricingByType('school-1', LessonType.CODE)).resolves.toBeNull();
  });
});
