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
  cancellationReason: null,
  cancelledBy: null,
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
  let pricing: { getPricingByType: jest.Mock };
  let service: LessonService;

  beforeEach(() => {
    repository = {
      createRequest: jest.fn(),
      findById: jest.fn(),
      findAll: jest.fn(),
      approve: jest.fn(),
      reject: jest.fn(),
      cancel: jest.fn(),
    };
    pricing = { getPricingByType: jest.fn() };
    students = { findByUserId: jest.fn() };
    instructors = { findById: jest.fn(), findByUserId: jest.fn() };
    students.findByUserId.mockResolvedValue({
      id: 'student-row-1',
      schoolId: 'school-1',
      authorized: true,
    });
    instructors.findById.mockResolvedValue({ id: 'instr-1', schoolId: 'school-1' });
    instructors.findByUserId.mockResolvedValue({ id: 'instr-1', schoolId: 'school-1' });
    service = new LessonService(
      repository,
      students,
      instructors,
      pricing,
      new SchoolGuard(instructors),
      24
    );
  });

  describe('approveLesson (L5, D-30 / D-32)', () => {
    const dto = { scheduledDate: future, durationMinutes: 60 };

    it('prix de la grille de l’école, instructeur = appelant, statut scheduled', async () => {
      repository.findById.mockResolvedValue(lesson);
      pricing.getPricingByType.mockResolvedValue({ price: 40 });
      repository.approve.mockResolvedValue({
        ...lesson,
        status: LessonStatus.SCHEDULED,
        price: 40,
      });

      await expect(
        service.approveLesson(instructor, 'lesson-1', { ...dto, price: 99 })
      ).resolves.toMatchObject({ status: 'scheduled', price: 40 });

      expect(pricing.getPricingByType).toHaveBeenCalledWith('school-1', LessonType.PARC);
      expect(repository.approve).toHaveBeenCalledWith('lesson-1', {
        instructorId: 'instr-1',
        scheduledDate: future,
        durationMinutes: 60,
        price: 40,
        adminNotes: undefined,
      });
    });

    it('sans tarif dans la grille : prix saisi ; sans prix non plus → 400 PRICE_REQUIRED', async () => {
      repository.findById.mockResolvedValue(lesson);
      pricing.getPricingByType.mockResolvedValue(null);
      repository.approve.mockResolvedValue({
        ...lesson,
        status: LessonStatus.SCHEDULED,
        price: 55,
      });

      await expect(
        service.approveLesson(instructor, 'lesson-1', { ...dto, price: 55 })
      ).resolves.toMatchObject({ price: 55 });
      expect(repository.approve).toHaveBeenLastCalledWith(
        'lesson-1',
        expect.objectContaining({ price: 55 })
      );

      await expect(service.approveLesson(instructor, 'lesson-1', dto)).rejects.toMatchObject({
        status: 400,
        code: 'PRICE_REQUIRED',
      });
    });

    it('403 FORBIDDEN_SCHOOL hors de son école ou sans fiche ; 409 si plus pending ; 404 inconnue', async () => {
      repository.findById.mockResolvedValue({ ...lesson, schoolId: 'school-2' });
      await expect(service.approveLesson(instructor, 'lesson-1', dto)).rejects.toMatchObject({
        status: 403,
        code: 'FORBIDDEN_SCHOOL',
      });

      instructors.findByUserId.mockResolvedValue(null);
      repository.findById.mockResolvedValue(lesson);
      await expect(service.approveLesson(instructor, 'lesson-1', dto)).rejects.toMatchObject({
        code: 'FORBIDDEN_SCHOOL',
      });

      instructors.findByUserId.mockResolvedValue({ id: 'instr-1', schoolId: 'school-1' });
      repository.findById.mockResolvedValue({ ...lesson, status: LessonStatus.SCHEDULED });
      await expect(service.approveLesson(instructor, 'lesson-1', dto)).rejects.toMatchObject({
        status: 409,
      });

      repository.findById.mockResolvedValue(null);
      await expect(service.approveLesson(instructor, 'ghost', dto)).rejects.toMatchObject({
        status: 404,
      });
      expect(repository.approve).not.toHaveBeenCalled();
    });

    it('course entre deux instructeurs : le second reçoit 409 CONFLICT', async () => {
      repository.findById.mockResolvedValue(lesson);
      pricing.getPricingByType.mockResolvedValue({ price: 40 });
      repository.approve.mockResolvedValue(null);

      await expect(service.approveLesson(instructor, 'lesson-1', dto)).rejects.toMatchObject({
        status: 409,
        code: 'CONFLICT',
      });
    });
  });

  describe('rejectLesson (L6)', () => {
    const reason = { reason: 'Créneau indisponible' };

    it('instructeur de l’école ou admin : rejected avec motif ; 409 si plus pending ; 403 autre école', async () => {
      repository.findById.mockResolvedValue(lesson);
      repository.reject.mockResolvedValue({ ...lesson, status: LessonStatus.REJECTED });

      await expect(service.rejectLesson(instructor, 'lesson-1', reason)).resolves.toMatchObject({
        status: 'rejected',
      });
      expect(repository.reject).toHaveBeenCalledWith('lesson-1', 'Créneau indisponible');
      await expect(service.rejectLesson(admin, 'lesson-1', reason)).resolves.toBeDefined();

      repository.findById.mockResolvedValue({ ...lesson, status: LessonStatus.SCHEDULED });
      await expect(service.rejectLesson(instructor, 'lesson-1', reason)).rejects.toMatchObject({
        status: 409,
      });

      repository.findById.mockResolvedValue({ ...lesson, schoolId: 'school-2' });
      await expect(service.rejectLesson(instructor, 'lesson-1', reason)).rejects.toMatchObject({
        status: 403,
        code: 'FORBIDDEN_SCHOOL',
      });

      repository.findById.mockResolvedValue(lesson);
      repository.reject.mockResolvedValue(null);
      await expect(service.rejectLesson(instructor, 'lesson-1', reason)).rejects.toMatchObject({
        status: 409,
      });
    });
  });

  describe('cancelLesson (L3, D-24)', () => {
    const in48h = new Date(Date.now() + 48 * 3600 * 1000);
    const in2h = new Date(Date.now() + 2 * 3600 * 1000);

    it('élève : sa demande pending à tout moment, sa leçon planifiée à plus de 24 h', async () => {
      repository.findById.mockResolvedValue(lesson);
      repository.cancel.mockResolvedValue({ ...lesson, status: LessonStatus.CANCELLED });

      await expect(
        service.cancelLesson(student, 'lesson-1', { reason: 'Empêchement' })
      ).resolves.toMatchObject({ status: 'cancelled' });
      expect(repository.cancel).toHaveBeenCalledWith('lesson-1', 'user-1', 'Empêchement');

      repository.findById.mockResolvedValue({
        ...lesson,
        status: LessonStatus.SCHEDULED,
        scheduledDate: in48h,
      });
      await expect(service.cancelLesson(student, 'lesson-1', {})).resolves.toBeDefined();
    });

    it('élève : 403 CANCEL_WINDOW_CLOSED à moins de 24 h d’une leçon planifiée ; 403 si pas la sienne', async () => {
      repository.findById.mockResolvedValue({
        ...lesson,
        status: LessonStatus.SCHEDULED,
        scheduledDate: in2h,
      });
      await expect(service.cancelLesson(student, 'lesson-1', {})).rejects.toMatchObject({
        status: 403,
        code: 'CANCEL_WINDOW_CLOSED',
      });

      repository.findById.mockResolvedValue(lesson);
      await expect(
        service.cancelLesson({ ...student, userId: 'user-2' }, 'lesson-1', {})
      ).rejects.toMatchObject({ status: 403, code: 'FORBIDDEN' });
      expect(repository.cancel).not.toHaveBeenCalled();
    });

    it('instructeur : toute leçon pending ou scheduled de son école, sans fenêtre ; 403 autre école', async () => {
      repository.findById.mockResolvedValue({
        ...lesson,
        status: LessonStatus.SCHEDULED,
        scheduledDate: in2h,
      });
      repository.cancel.mockResolvedValue({ ...lesson, status: LessonStatus.CANCELLED });

      await expect(service.cancelLesson(instructor, 'lesson-1', {})).resolves.toMatchObject({
        status: 'cancelled',
      });
      expect(repository.cancel).toHaveBeenCalledWith('lesson-1', 'user-instr', undefined);

      repository.findById.mockResolvedValue({ ...lesson, schoolId: 'school-2' });
      await expect(service.cancelLesson(instructor, 'lesson-1', {})).rejects.toMatchObject({
        status: 403,
        code: 'FORBIDDEN_SCHOOL',
      });
    });

    it('409 CONFLICT pour une leçon terminée, refusée ou déjà annulée, ou si le statut change en cours', async () => {
      repository.findById.mockResolvedValue({ ...lesson, status: LessonStatus.COMPLETED });
      await expect(service.cancelLesson(instructor, 'lesson-1', {})).rejects.toMatchObject({
        status: 409,
      });

      repository.findById.mockResolvedValue(lesson);
      repository.cancel.mockResolvedValue(null);
      await expect(service.cancelLesson(instructor, 'lesson-1', {})).rejects.toMatchObject({
        status: 409,
      });
    });
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
