import { SchoolGuard } from '../../../../http/authz';
import { AuthUser, UserRole } from '../../../../types/auth';
import { IExamRepository } from '../../repositories/exam.repository';
import { Exam, ExamResult, ExamStatus, ExamType } from '../../types/exam.types';
import { ExamService } from '../exam.service';

const future = new Date(Date.now() + 14 * 24 * 3600 * 1000);
const past = new Date(Date.now() - 24 * 3600 * 1000);
const student: AuthUser = { userId: 'user-1', email: 's@x.io', role: UserRole.STUDENT };
const instructor: AuthUser = { userId: 'user-instr', email: 'i@x.io', role: UserRole.INSTRUCTOR };
const admin: AuthUser = { userId: 'user-admin', email: 'a@x.io', role: UserRole.ADMIN };

const exam: Exam = {
  id: 'exam-1',
  schoolId: 'school-1',
  studentId: 'user-1',
  studentFirstName: 'Élève',
  studentLastName: 'Test',
  studentCompletedLessons: 12,
  type: ExamType.THEORY,
  status: ExamStatus.PENDING,
  preferredDate: future,
  message: 'Je suis prêt',
  dateTime: null,
  location: null,
  result: ExamResult.PENDING,
  score: null,
  notes: null,
  rejectionReason: null,
  price: null,
  paid: false,
  amount: null,
  paymentDate: null,
  paymentMethod: null,
  createdAt: past,
  updatedAt: past,
};

describe('ExamService (D-01 / D-33 : demande X2, liste X1, lecture scoped)', () => {
  let repository: jest.Mocked<IExamRepository>;
  let students: { findByUserId: jest.Mock };
  let instructors: { findByUserId: jest.Mock };
  let service: ExamService;

  beforeEach(() => {
    repository = { createRequest: jest.fn(), findById: jest.fn(), findAll: jest.fn() };
    students = { findByUserId: jest.fn() };
    instructors = { findByUserId: jest.fn() };
    students.findByUserId.mockResolvedValue({
      id: 'student-row-1',
      schoolId: 'school-1',
      authorized: true,
    });
    instructors.findByUserId.mockResolvedValue({ id: 'instr-1', schoolId: 'school-1' });
    service = new ExamService(repository, students, instructors, new SchoolGuard(instructors));
  });

  describe('requestExam (X2)', () => {
    const dto = { examType: ExamType.THEORY, preferredDate: future, message: 'Je suis prêt' };

    it('école résolue depuis l’inscription approuvée ; demande pending, sans éligibilité (D-26)', async () => {
      repository.createRequest.mockResolvedValue(exam);

      await expect(service.requestExam(student, dto)).resolves.toEqual(exam);
      expect(repository.createRequest).toHaveBeenCalledWith({
        ...dto,
        studentRowId: 'student-row-1',
        schoolId: 'school-1',
      });
    });

    it('403 NOT_ENROLLED sans fiche students ou sans autorisation', async () => {
      students.findByUserId.mockResolvedValue(null);
      await expect(service.requestExam(student, dto)).rejects.toMatchObject({
        status: 403,
        code: 'NOT_ENROLLED',
      });
      students.findByUserId.mockResolvedValue({ id: 's', schoolId: 'school-1', authorized: false });
      await expect(service.requestExam(student, dto)).rejects.toMatchObject({
        code: 'NOT_ENROLLED',
      });
      expect(repository.createRequest).not.toHaveBeenCalled();
    });
  });

  describe('listExams (X1)', () => {
    beforeEach(() => repository.findAll.mockResolvedValue([exam]));

    it('élève : ses examens ; sans fiche → portée impossible, liste vide', async () => {
      await expect(service.listExams(student, { status: [ExamStatus.PENDING] })).resolves.toEqual([
        exam,
      ]);
      expect(repository.findAll).toHaveBeenCalledWith(
        { kind: 'student', studentRowId: 'student-row-1' },
        { status: ['pending'] }
      );

      students.findByUserId.mockResolvedValue(null);
      await service.listExams(student, {});
      expect(repository.findAll).toHaveBeenLastCalledWith(
        { kind: 'student', studentRowId: '00000000-0000-0000-0000-000000000000' },
        {}
      );
    });

    it('instructeur : tous les examens de son école (pas d’instructeur attitré) ; 403 sans fiche', async () => {
      await service.listExams(instructor, {});
      expect(repository.findAll).toHaveBeenLastCalledWith(
        { kind: 'school', schoolId: 'school-1' },
        {}
      );

      instructors.findByUserId.mockResolvedValue(null);
      await expect(service.listExams(instructor, {})).rejects.toMatchObject({
        status: 403,
        code: 'FORBIDDEN_SCHOOL',
      });
    });

    it('admin : tout', async () => {
      await service.listExams(admin, {});
      expect(repository.findAll).toHaveBeenLastCalledWith({ kind: 'all' }, {});
    });
  });

  describe('getExam (GET /:id, scoped)', () => {
    it('404 inconnu ; élève : le sien seulement ; instructeur : son école ; admin : tout', async () => {
      repository.findById.mockResolvedValue(null);
      await expect(service.getExam(student, 'ghost')).rejects.toMatchObject({ status: 404 });

      repository.findById.mockResolvedValue(exam);
      await expect(service.getExam(student, 'exam-1')).resolves.toEqual(exam);
      await expect(
        service.getExam({ ...student, userId: 'user-2' }, 'exam-1')
      ).rejects.toMatchObject({ status: 403, code: 'FORBIDDEN' });
      await expect(service.getExam(instructor, 'exam-1')).resolves.toEqual(exam);

      repository.findById.mockResolvedValue({ ...exam, schoolId: 'school-2' });
      await expect(service.getExam(instructor, 'exam-1')).rejects.toMatchObject({
        status: 403,
        code: 'FORBIDDEN_SCHOOL',
      });
      await expect(service.getExam(admin, 'exam-1')).resolves.toMatchObject({
        schoolId: 'school-2',
      });
    });
  });
});
