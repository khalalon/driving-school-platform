import { SchoolGuard } from '../../../../http/authz';
import { AuthUser, UserRole } from '../../../../types/auth';
import { LessonType } from '../../../../types/domain';
import { ILessonRepository } from '../../repositories/lesson.repository';
import { Lesson, LessonStatus } from '../../types/lesson.types';
import { LessonService } from '../lesson.service';

const future = new Date(Date.now() + 7 * 24 * 3600 * 1000);
const past = new Date(Date.now() - 24 * 3600 * 1000);
const student: AuthUser = { userId: 'user-1', email: 's@x.io', role: UserRole.STUDENT };
const instructor: AuthUser = { userId: 'user-instr', email: 'i@x.io', role: UserRole.INSTRUCTOR };
const admin: AuthUser = { userId: 'user-admin', email: 'a@x.io', role: UserRole.ADMIN };

const lesson: Lesson = {
  id: 'lesson-1',
  schoolId: 'school-1',
  studentId: 'user-1',
  student: { id: 'user-1', firstName: 'Élève', lastName: 'Test' },
  instructorId: null,
  instructor: null,
  preferredInstructorId: 'instr-1',
  type: LessonType.PARC,
  status: LessonStatus.PENDING,
  requestedDate: future,
  scheduledDate: null,
  durationMinutes: null,
  price: null,
  capacity: 1,
  currentBookings: 1,
  notes: null,
  adminNotes: null,
  rejectionReason: null,
  attended: null,
  feedback: null,
  rating: null,
  paid: false,
  amount: null,
  paymentDate: null,
  paymentMethod: null,
  createdAt: past,
  updatedAt: past,
};

describe('LessonService (D-21 / D-32 : demande L2, liste L1, lecture scoped)', () => {
  let repository: jest.Mocked<ILessonRepository>;
  let students: { findByUserId: jest.Mock };
  let instructors: { findById: jest.Mock; findByUserId: jest.Mock };
  let service: LessonService;

  beforeEach(() => {
    repository = { createRequest: jest.fn(), findById: jest.fn(), findAll: jest.fn() };
    students = { findByUserId: jest.fn() };
    instructors = { findById: jest.fn(), findByUserId: jest.fn() };
    students.findByUserId.mockResolvedValue({
      id: 'student-row-1',
      schoolId: 'school-1',
      authorized: true,
    });
    instructors.findById.mockResolvedValue({ id: 'instr-1', schoolId: 'school-1' });
    instructors.findByUserId.mockResolvedValue({ id: 'instr-1', schoolId: 'school-1' });
    service = new LessonService(repository, students, instructors, new SchoolGuard(instructors));
  });

  describe('requestLesson (L2)', () => {
    const dto = { type: LessonType.PARC, requestedDate: future, preferredInstructorId: 'instr-1' };

    it('école résolue depuis l’inscription approuvée ; demande pending sans instructeur', async () => {
      repository.createRequest.mockResolvedValue(lesson);

      await expect(service.requestLesson(student, dto)).resolves.toEqual(lesson);

      expect(students.findByUserId).toHaveBeenCalledWith('user-1');
      expect(repository.createRequest).toHaveBeenCalledWith({
        ...dto,
        studentRowId: 'student-row-1',
        schoolId: 'school-1',
      });
    });

    it('403 NOT_ENROLLED sans fiche students ou sans autorisation', async () => {
      students.findByUserId.mockResolvedValue(null);
      await expect(service.requestLesson(student, dto)).rejects.toMatchObject({
        status: 403,
        code: 'NOT_ENROLLED',
      });

      students.findByUserId.mockResolvedValue({ id: 's', schoolId: 'school-1', authorized: false });
      await expect(service.requestLesson(student, dto)).rejects.toMatchObject({
        code: 'NOT_ENROLLED',
      });
      expect(repository.createRequest).not.toHaveBeenCalled();
    });

    it('400 VALIDATION_ERROR si l’instructeur préféré n’est pas de l’école de l’élève', async () => {
      instructors.findById.mockResolvedValue({ id: 'instr-2', schoolId: 'school-2' });
      await expect(service.requestLesson(student, dto)).rejects.toMatchObject({
        status: 400,
        code: 'VALIDATION_ERROR',
      });

      instructors.findById.mockResolvedValue(null);
      await expect(service.requestLesson(student, dto)).rejects.toMatchObject({ status: 400 });
      expect(repository.createRequest).not.toHaveBeenCalled();
    });

    it('sans préférence : aucune vérification d’instructeur', async () => {
      repository.createRequest.mockResolvedValue(lesson);
      await service.requestLesson(student, { type: LessonType.CODE, requestedDate: future });
      expect(instructors.findById).not.toHaveBeenCalled();
    });
  });

  describe('listLessons (L1)', () => {
    beforeEach(() => repository.findAll.mockResolvedValue([lesson]));

    it('élève : ses leçons (fiche students) ; sans fiche → portée impossible, liste vide', async () => {
      await expect(
        service.listLessons(student, { status: [LessonStatus.PENDING] })
      ).resolves.toEqual([lesson]);
      expect(repository.findAll).toHaveBeenCalledWith(
        { kind: 'student', studentRowId: 'student-row-1' },
        { status: ['pending'] }
      );

      students.findByUserId.mockResolvedValue(null);
      await service.listLessons(student, {});
      expect(repository.findAll).toHaveBeenLastCalledWith(
        { kind: 'student', studentRowId: '00000000-0000-0000-0000-000000000000' },
        {}
      );
    });

    it('instructeur : file de son école et/ou ses leçons selon scope ; 403 sans fiche', async () => {
      await service.listLessons(instructor, { scope: 'school' });
      expect(repository.findAll).toHaveBeenLastCalledWith(
        { kind: 'instructor', instructorId: 'instr-1', schoolId: 'school-1', scope: 'school' },
        { scope: 'school' }
      );
      await service.listLessons(instructor, {});
      expect(repository.findAll).toHaveBeenLastCalledWith(
        expect.objectContaining({ kind: 'instructor', scope: 'both' }),
        {}
      );

      instructors.findByUserId.mockResolvedValue(null);
      await expect(service.listLessons(instructor, {})).rejects.toMatchObject({
        status: 403,
        code: 'FORBIDDEN_SCHOOL',
      });
    });

    it('admin : tout', async () => {
      await service.listLessons(admin, { date: '2026-10-01' });
      expect(repository.findAll).toHaveBeenLastCalledWith({ kind: 'all' }, { date: '2026-10-01' });
    });
  });

  describe('getLesson (GET /:id, scoped)', () => {
    it('404 inconnue ; élève : sa leçon seulement (403 sinon)', async () => {
      repository.findById.mockResolvedValue(null);
      await expect(service.getLesson(student, 'ghost')).rejects.toMatchObject({ status: 404 });

      repository.findById.mockResolvedValue(lesson);
      await expect(service.getLesson(student, 'lesson-1')).resolves.toEqual(lesson);
      await expect(
        service.getLesson({ ...student, userId: 'user-2' }, 'lesson-1')
      ).rejects.toMatchObject({ status: 403, code: 'FORBIDDEN' });
    });

    it('instructeur : leçons de son école (403 FORBIDDEN_SCHOOL sinon) ; admin : tout', async () => {
      repository.findById.mockResolvedValue(lesson);
      await expect(service.getLesson(instructor, 'lesson-1')).resolves.toEqual(lesson);

      repository.findById.mockResolvedValue({ ...lesson, schoolId: 'school-2' });
      await expect(service.getLesson(instructor, 'lesson-1')).rejects.toMatchObject({
        status: 403,
        code: 'FORBIDDEN_SCHOOL',
      });
      await expect(service.getLesson(admin, 'lesson-1')).resolves.toMatchObject({
        schoolId: 'school-2',
      });
    });
  });
});
