import { IExamRepository } from '../../repositories/exam.repository';
import { Exam, ExamResult, ExamStatus, ExamType } from '../../types/exam.types';
import { ExamService } from '../exam.service';

const future = new Date(Date.now() + 14 * 24 * 3600 * 1000);
const past = new Date(Date.now() - 24 * 3600 * 1000);
const exam: Exam = {
  id: 'exam-1',
  schoolId: 'school-1',
  studentId: 'student-1',
  studentFirstName: 'Élève',
  studentLastName: 'Test',
  studentCompletedLessons: 12,
  type: ExamType.THEORY,
  status: ExamStatus.SCHEDULED,
  preferredDate: null,
  message: null,
  dateTime: future,
  location: 'Centre ATTT',
  result: ExamResult.PENDING,
  score: null,
  notes: null,
  rejectionReason: null,
  price: 60,
  paid: false,
  amount: null,
  paymentDate: null,
  paymentMethod: null,
  examinerId: null,
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
  };
}

describe('ExamService (anciennes sessions sur le schéma 008)', () => {
  let repository: jest.Mocked<IExamRepository>;
  let service: ExamService;

  beforeEach(() => {
    repository = examRepositoryMock();
    service = new ExamService(repository);
  });

  it('createExam : date passée → 400 ; sinon crée pour l’élève donné', async () => {
    const dto = {
      schoolId: 'school-1',
      studentId: 'student-1',
      type: ExamType.THEORY,
      dateTime: past,
      price: 60,
    };
    await expect(service.createExam(dto)).rejects.toMatchObject({ status: 400 });

    repository.create.mockResolvedValue(exam);
    await expect(service.createExam({ ...dto, dateTime: future })).resolves.toEqual(exam);
    expect(repository.create).toHaveBeenCalledWith({ ...dto, dateTime: future });
  });

  it('getExamById : 404 « Examen introuvable » ; getExams relaie les filtres', async () => {
    repository.findById.mockResolvedValue(null);
    await expect(service.getExamById('ghost')).rejects.toMatchObject({
      status: 404,
      message: 'Examen introuvable',
    });

    repository.findAll.mockResolvedValue([exam]);
    await expect(service.getExams({ status: [ExamStatus.PENDING] })).resolves.toEqual([exam]);
    expect(repository.findAll).toHaveBeenCalledWith({ status: ['pending'] });
  });

  it('updateExam : vérifie l’existence et la date', async () => {
    repository.findById.mockResolvedValue(exam);
    await expect(service.updateExam('exam-1', { dateTime: past })).rejects.toMatchObject({
      status: 400,
    });
    repository.update.mockResolvedValue({ ...exam, price: 70 });
    await expect(service.updateExam('exam-1', { price: 70 })).resolves.toMatchObject({ price: 70 });

    repository.findById.mockResolvedValue(null);
    await expect(service.updateExam('ghost', { price: 70 })).rejects.toMatchObject({ status: 404 });
  });

  it('deleteExam : 404 si inconnu, sinon supprime (plus de compte d’inscrits depuis 008)', async () => {
    repository.findById.mockResolvedValue(null);
    await expect(service.deleteExam('ghost')).rejects.toMatchObject({ status: 404 });
    expect(repository.delete).not.toHaveBeenCalled();

    repository.findById.mockResolvedValue(exam);
    await service.deleteExam('exam-1');
    expect(repository.delete).toHaveBeenCalledWith('exam-1');
  });
});
