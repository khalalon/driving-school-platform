import { IEnrollmentRepository } from '../../repositories/enrollment.repository';
import { IStudentRepository } from '../../repositories/student.repository';
import { EnrollmentRequest, Student } from '../../types/student.types';
import { EnrollmentService } from '../enrollment.service';

describe('EnrollmentService (D-09)', () => {
  let enrollmentRepository: jest.Mocked<IEnrollmentRepository>;
  let studentRepository: jest.Mocked<IStudentRepository>;
  let service: EnrollmentService;

  const userId = 'user-1';
  const schoolId = 'school-1';
  const instructorId = 'user-instr';
  const now = new Date('2026-09-18T10:00:00Z');

  const pending: EnrollmentRequest = {
    id: 'req-1',
    studentId: userId,
    schoolId,
    status: 'pending',
    message: 'Bonjour',
    rejectionReason: null,
    processedBy: null,
    processedAt: null,
    createdAt: now,
    updatedAt: now,
  };
  const student: Student = {
    id: 'student-1',
    userId,
    schoolId,
    authorized: true,
    enrollmentRequestId: 'req-1',
    enrollmentDate: now,
    createdAt: now,
    updatedAt: now,
  };

  beforeEach(() => {
    enrollmentRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      findByStudent: jest.fn(),
      findBySchool: jest.fn(),
      findByStudentAndSchool: jest.fn(),
      updateStatus: jest.fn(),
    };
    studentRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      findByUserId: jest.fn(),
      findByUserAndSchool: jest.fn(),
      findBySchool: jest.fn(),
    };
    service = new EnrollmentService(enrollmentRepository, studentRepository);
  });

  describe('createEnrollmentRequest (E2)', () => {
    it('crée la demande avec le users.id de l’appelant et le message', async () => {
      studentRepository.findByUserAndSchool.mockResolvedValue(null);
      enrollmentRepository.findByStudentAndSchool.mockResolvedValue(null);
      enrollmentRepository.create.mockResolvedValue(pending);

      const result = await service.createEnrollmentRequest(userId, schoolId, 'Bonjour');

      expect(enrollmentRepository.create).toHaveBeenCalledWith(userId, schoolId, 'Bonjour');
      expect(result).toEqual(pending);
    });

    it('409 CONFLICT si l’élève est déjà inscrit dans cette école', async () => {
      studentRepository.findByUserAndSchool.mockResolvedValue(student);

      await expect(service.createEnrollmentRequest(userId, schoolId)).rejects.toMatchObject({
        status: 409,
        code: 'CONFLICT',
      });
      expect(enrollmentRepository.create).not.toHaveBeenCalled();
    });

    it('409 CONFLICT si une demande est déjà pending', async () => {
      studentRepository.findByUserAndSchool.mockResolvedValue(null);
      enrollmentRepository.findByStudentAndSchool.mockResolvedValue(pending);

      await expect(service.createEnrollmentRequest(userId, schoolId)).rejects.toMatchObject({
        status: 409,
        message: 'Une demande est déjà en attente pour cette école',
      });
    });

    it('409 CONFLICT si la dernière demande est approved', async () => {
      studentRepository.findByUserAndSchool.mockResolvedValue(null);
      enrollmentRepository.findByStudentAndSchool.mockResolvedValue({
        ...pending,
        status: 'approved',
      });

      await expect(service.createEnrollmentRequest(userId, schoolId)).rejects.toMatchObject({
        status: 409,
      });
    });

    it('autorise une nouvelle demande après un refus', async () => {
      studentRepository.findByUserAndSchool.mockResolvedValue(null);
      enrollmentRepository.findByStudentAndSchool.mockResolvedValue({
        ...pending,
        status: 'rejected',
      });
      enrollmentRepository.create.mockResolvedValue(pending);

      await expect(service.createEnrollmentRequest(userId, schoolId)).resolves.toEqual(pending);
    });
  });

  describe('approveRequest (E5)', () => {
    it('passe la demande en approved puis crée la ligne students autorisée', async () => {
      enrollmentRepository.findById.mockResolvedValue(pending);
      enrollmentRepository.updateStatus.mockResolvedValue({ ...pending, status: 'approved' });
      studentRepository.create.mockResolvedValue(student);

      const result = await service.approveRequest('req-1', instructorId);

      expect(enrollmentRepository.updateStatus).toHaveBeenCalledWith(
        'req-1',
        'approved',
        instructorId
      );
      expect(studentRepository.create).toHaveBeenCalledWith({
        userId,
        schoolId,
        authorized: true,
        enrollmentRequestId: 'req-1',
      });
      expect(result.status).toBe('approved');
    });

    it('404 NOT_FOUND pour une demande inconnue', async () => {
      enrollmentRepository.findById.mockResolvedValue(null);

      await expect(service.approveRequest('ghost', instructorId)).rejects.toMatchObject({
        status: 404,
        code: 'NOT_FOUND',
      });
    });

    it('409 CONFLICT pour une demande déjà traitée', async () => {
      enrollmentRepository.findById.mockResolvedValue({ ...pending, status: 'rejected' });

      await expect(service.approveRequest('req-1', instructorId)).rejects.toMatchObject({
        status: 409,
        message: 'Cette demande a déjà été traitée',
      });
      expect(enrollmentRepository.updateStatus).not.toHaveBeenCalled();
    });
  });

  describe('rejectRequest (E6)', () => {
    it('enregistre le refus et son motif', async () => {
      enrollmentRepository.findById.mockResolvedValue(pending);
      enrollmentRepository.updateStatus.mockResolvedValue({
        ...pending,
        status: 'rejected',
        rejectionReason: 'Dossier incomplet, merci',
      });

      const result = await service.rejectRequest('req-1', instructorId, 'Dossier incomplet, merci');

      expect(enrollmentRepository.updateStatus).toHaveBeenCalledWith(
        'req-1',
        'rejected',
        instructorId,
        'Dossier incomplet, merci'
      );
      expect(result.rejectionReason).toBe('Dossier incomplet, merci');
    });
  });

  describe('getEnrollmentStatus (E1)', () => {
    it('élève autorisé : isEnrolled et canBook vrais, date d’inscription', async () => {
      studentRepository.findByUserAndSchool.mockResolvedValue(student);

      await expect(service.getEnrollmentStatus(userId, schoolId)).resolves.toEqual({
        isEnrolled: true,
        requestStatus: 'approved',
        enrollmentDate: now,
        canBook: true,
      });
    });

    it('demande en attente : statut pending, canBook faux', async () => {
      studentRepository.findByUserAndSchool.mockResolvedValue(null);
      enrollmentRepository.findByStudentAndSchool.mockResolvedValue(pending);

      await expect(service.getEnrollmentStatus(userId, schoolId)).resolves.toEqual({
        isEnrolled: false,
        requestStatus: 'pending',
        canBook: false,
      });
    });

    it('aucune relation : rien', async () => {
      studentRepository.findByUserAndSchool.mockResolvedValue(null);
      enrollmentRepository.findByStudentAndSchool.mockResolvedValue(null);

      await expect(service.getEnrollmentStatus(userId, schoolId)).resolves.toEqual({
        isEnrolled: false,
        canBook: false,
      });
    });
  });

  it('getStudentRequests / getSchoolRequests délèguent au repository', async () => {
    enrollmentRepository.findByStudent.mockResolvedValue([pending]);
    enrollmentRepository.findBySchool.mockResolvedValue([pending]);

    await expect(service.getStudentRequests(userId)).resolves.toEqual([pending]);
    await expect(service.getSchoolRequests(schoolId, 'pending')).resolves.toEqual([pending]);
    expect(enrollmentRepository.findBySchool).toHaveBeenCalledWith(schoolId, 'pending');
  });
});
