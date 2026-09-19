/**
 * SchoolService — S1 à S4 (publics) et S6 (instructeur de l'école) : URL et `response.data`.
 */
import { mockApiClientModule, mockedApiClient, respond } from './mockApiClient';

jest.mock('../ApiClient', () => mockApiClientModule());

import { schoolService } from '../SchoolService';
import { LessonType } from '../../../models/Lesson';

const api = mockedApiClient();
const schoolId = '11111111-1111-4111-8111-111111111111';
const school = { id: schoolId, name: 'Seed Driving School' };

describe('SchoolService', () => {
  it('getAllSchools (S1) : GET /api/schools', async () => {
    api.get.mockResolvedValue(respond([school]));

    const result = await schoolService.getAllSchools();

    expect(api.get).toHaveBeenCalledWith('/api/schools');
    expect(result).toEqual([school]);
  });

  it('getSchoolById (S2) : GET /api/schools/:id', async () => {
    api.get.mockResolvedValue(respond(school));

    const result = await schoolService.getSchoolById(schoolId);

    expect(api.get).toHaveBeenCalledWith(`/api/schools/${schoolId}`);
    expect(result).toEqual(school);
  });

  it('getSchoolInstructors (S3) : GET /api/schools/:id/instructors', async () => {
    const instructors = [{ id: 'i1', firstName: 'Seed', lastName: 'Instructor', specialties: [] }];
    api.get.mockResolvedValue(respond(instructors));

    const result = await schoolService.getSchoolInstructors(schoolId);

    expect(api.get).toHaveBeenCalledWith(`/api/schools/${schoolId}/instructors`);
    expect(result).toEqual(instructors);
  });

  it('getSchoolPricing (S4) : GET /api/schools/:id/pricing', async () => {
    const pricing = [{ id: 'p1', schoolId, lessonType: LessonType.CODE, price: 20, duration: 60 }];
    api.get.mockResolvedValue(respond(pricing));

    const result = await schoolService.getSchoolPricing(schoolId);

    expect(api.get).toHaveBeenCalledWith(`/api/schools/${schoolId}/pricing`);
    expect(result).toEqual(pricing);
  });

  it('getSchoolStudents (S6) : GET /api/schools/:id/students → studentId = users.id', async () => {
    const students = [
      {
        studentId: 'u1',
        firstName: 'Lina',
        lastName: 'Test',
        email: 'lina@t.io',
        phone: null,
        enrollmentDate: '2026-09-19T01:34:59.660Z',
        completedLessons: 0,
      },
    ];
    api.get.mockResolvedValue(respond(students));

    const result = await schoolService.getSchoolStudents(schoolId);

    expect(api.get).toHaveBeenCalledWith(`/api/schools/${schoolId}/students`);
    expect(result).toEqual(students);
  });
});
