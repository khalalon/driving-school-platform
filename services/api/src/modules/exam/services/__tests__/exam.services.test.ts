import { IExamRepository } from '../../repositories/exam.repository';
import { IRegistrationRepository } from '../../repositories/registration.repository';
import { Exam, ExamRegistration, ExamResult, ExamType } from '../../types/exam.types';
import { ExamService } from '../exam.service';
import { RegistrationService, StudentLookup } from '../registration.service';

const future = new Date(Date.now() + 14 * 24 * 3600 * 1000);
const past = new Date(Date.now() - 24 * 3600 * 1000);
const exam: Exam = {
  id: 'exam-1',
  schoolId: 'school-1',
  type: ExamType.THEORY,
  dateTime: future,
  examinerId: null,
  price: 60,
  capacity: 2,
  createdAt: past,
  updatedAt: past,
};
const registration: ExamRegistration = {
  id: 'reg-1',
  examId: 'exam-1',
  studentId: 'student-1',
  result: ExamResult.PENDING,
  score: null,
  notes: null,
  createdAt: past,
  updatedAt: past,
};

function examRepositoryMock(): jest.Mocked<IExamRepository> {
  return {
    create: jest.fn(),
    findById: jest.fn(),
    findAll: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    countRegistrations: jest.fn(),
  };
}

describe('ExamService (sessions, état actuel)', () => {
  let repository: jest.Mocked<IExamRepository>;
  let service: ExamService;

  beforeEach(() => {
    repository = examRepositoryMock();
    service = new ExamService(repository);
  });

  it('createExam : date passée → 400 ; sinon crée', async () => {
    await expect(
      service.createExam({ schoolId: 'school-1', type: ExamType.THEORY, dateTime: past, price: 60 })
    ).rejects.toMatchObject({ status: 400 });
    repository.create.mockResolvedValue(exam);
    await expect(
      service.createExam({
        schoolId: 'school-1',
        type: ExamType.THEORY,
        dateTime: future,
        price: 60,
      })
    ).resolves.toEqual(exam);
  });

  it('getExamById : 404 « Examen introuvable »', async () => {
    repository.findById.mockResolvedValue(null);
    await expect(service.getExamById('ghost')).rejects.toMatchObject({
      status: 404,
      message: 'Examen introuvable',
    });
  });

  it('updateExam : vérifie l’existence et la date', async () => {
    repository.findById.mockResolvedValue(exam);
    await expect(service.updateExam('exam-1', { dateTime: past })).rejects.toMatchObject({
      status: 400,
    });
    repository.update.mockResolvedValue({ ...exam, price: 70 });
    await expect(service.updateExam('exam-1', { price: 70 })).resolves.toMatchObject({ price: 70 });
  });

  it('deleteExam : refusé (409) avec des inscrits', async () => {
    repository.findById.mockResolvedValue(exam);
    repository.countRegistrations.mockResolvedValue(1);
    await expect(service.deleteExam('exam-1')).rejects.toMatchObject({ status: 409 });

    repository.countRegistrations.mockResolvedValue(0);
    await service.deleteExam('exam-1');
    expect(repository.delete).toHaveBeenCalledWith('exam-1');
  });

  it('checkAvailability : sans capacité → toujours vrai ; sinon selon les inscrits', async () => {
    repository.findById.mockResolvedValue({ ...exam, capacity: null });
    await expect(service.checkAvailability('exam-1')).resolves.toBe(true);

    repository.findById.mockResolvedValue(exam);
    repository.countRegistrations.mockResolvedValue(2);
    await expect(service.checkAvailability('exam-1')).resolves.toBe(false);
  });

  it('getExams délègue les filtres', async () => {
    repository.findAll.mockResolvedValue([exam]);
    await expect(service.getExams({ type: ExamType.THEORY })).resolves.toEqual([exam]);
  });
});

describe('RegistrationService (inscriptions, état actuel)', () => {
  let registrations: jest.Mocked<IRegistrationRepository>;
  let exams: jest.Mocked<IExamRepository>;
  let students: jest.Mocked<StudentLookup>;
  let service: RegistrationService;

  beforeEach(() => {
    registrations = {
      create: jest.fn(),
      findById: jest.fn(),
      findByExamId: jest.fn(),
      findByStudentId: jest.fn(),
      findByExamAndStudent: jest.fn(),
      updateResult: jest.fn(),
      delete: jest.fn(),
      countCompletedLessons: jest.fn(),
    };
    exams = examRepositoryMock();
    students = { findById: jest.fn() };
    service = new RegistrationService(registrations, exams, students);
  });

  it('registerForExam : élève autorisé et éligible → inscription créée', async () => {
    exams.findById.mockResolvedValue(exam);
    students.findById.mockResolvedValue({ id: 'student-1', authorized: true });
    registrations.countCompletedLessons.mockResolvedValue(25);
    registrations.findByExamAndStudent.mockResolvedValue(null);
    exams.countRegistrations.mockResolvedValue(1);
    registrations.create.mockResolvedValue(registration);

    await expect(service.registerForExam('exam-1', 'student-1')).resolves.toEqual(registration);
  });

  it('registerForExam : 404, 403 NOT_ENROLLED, 403 non éligible, 409 doublon, 409 complet', async () => {
    exams.findById.mockResolvedValue(null);
    await expect(service.registerForExam('ghost', 'student-1')).rejects.toMatchObject({
      status: 404,
    });

    exams.findById.mockResolvedValue(exam);
    students.findById.mockResolvedValue({ id: 'student-1', authorized: false });
    await expect(service.registerForExam('exam-1', 'student-1')).rejects.toMatchObject({
      status: 403,
      code: 'NOT_ENROLLED',
    });

    students.findById.mockResolvedValue({ id: 'student-1', authorized: true });
    registrations.countCompletedLessons.mockResolvedValue(5);
    await expect(service.registerForExam('exam-1', 'student-1')).rejects.toMatchObject({
      status: 403,
      message: 'Il manque 15 leçon(s) effectuée(s)',
    });

    registrations.countCompletedLessons.mockResolvedValue(25);
    registrations.findByExamAndStudent.mockResolvedValue(registration);
    await expect(service.registerForExam('exam-1', 'student-1')).rejects.toMatchObject({
      status: 409,
    });

    registrations.findByExamAndStudent.mockResolvedValue(null);
    exams.countRegistrations.mockResolvedValue(2);
    await expect(service.registerForExam('exam-1', 'student-1')).rejects.toMatchObject({
      status: 409,
      message: 'Cet examen est complet',
    });
    expect(registrations.create).not.toHaveBeenCalled();
  });

  it('recordResult / cancelRegistration', async () => {
    registrations.findById.mockResolvedValue(null);
    await expect(
      service.recordResult('ghost', { result: ExamResult.PASSED })
    ).rejects.toMatchObject({ status: 404 });

    registrations.findById.mockResolvedValue(registration);
    registrations.updateResult.mockResolvedValue({
      ...registration,
      result: ExamResult.PASSED,
      score: 18,
    });
    await expect(
      service.recordResult('reg-1', { result: ExamResult.PASSED, score: 18 })
    ).resolves.toMatchObject({ result: 'passed', score: 18 });

    registrations.findById.mockResolvedValue({ ...registration, result: ExamResult.FAILED });
    await expect(service.cancelRegistration('reg-1')).rejects.toMatchObject({ status: 409 });

    registrations.findById.mockResolvedValue(registration);
    await service.cancelRegistration('reg-1');
    expect(registrations.delete).toHaveBeenCalledWith('reg-1');
  });

  it('checkEligibility : practical exige 30 leçons', async () => {
    registrations.countCompletedLessons.mockResolvedValue(30);
    await expect(service.checkEligibility('student-1', ExamType.PRACTICAL)).resolves.toEqual({
      eligible: true,
      requiredLessons: 30,
      completedLessons: 30,
    });
  });

  it('lectures : par examen, par élève, par identifiant', async () => {
    registrations.findByExamId.mockResolvedValue([registration]);
    registrations.findByStudentId.mockResolvedValue([registration]);
    registrations.findById.mockResolvedValue(registration);
    await expect(service.getRegistrationsByExam('exam-1')).resolves.toEqual([registration]);
    await expect(service.getRegistrationsByStudent('student-1')).resolves.toEqual([registration]);
    await expect(service.getRegistrationById('reg-1')).resolves.toEqual(registration);
  });
});
