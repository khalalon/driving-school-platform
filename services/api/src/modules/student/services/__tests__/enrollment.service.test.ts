import { Pool, PoolClient } from 'pg';
import { ITransactionRunner, PgTransactionRunner, Queryable } from '../../../../db/transaction';
import {
  EnrollmentRepository,
  IEnrollmentRepository,
} from '../../repositories/enrollment.repository';
import { IStudentRepository, StudentRepository } from '../../repositories/student.repository';
import { EnrollmentRequest, Student } from '../../types/student.types';
import { EnrollmentService } from '../enrollment.service';

describe('EnrollmentService (D-09)', () => {
  let enrollmentRepository: jest.Mocked<IEnrollmentRepository>;
  let studentRepository: jest.Mocked<IStudentRepository>;
  let transactions: jest.Mocked<ITransactionRunner>;
  let service: EnrollmentService;
  // Client de transaction factice : le service doit le transmettre aux deux repositories.
  const tx: Queryable = { query: jest.fn() };

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
      findActiveByStudent: jest.fn(),
      updateStatus: jest.fn(),
    };
    studentRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      findByUserId: jest.fn(),
      findByUserAndSchool: jest.fn(),
      findBySchool: jest.fn(),
    };
    // Le générique de `run` ne se mocke pas directement : le runner factice exécute le travail
    // avec le client factice, sans BEGIN/COMMIT.
    const run = jest.fn((work: (client: Queryable) => Promise<unknown>) => work(tx));
    transactions = { run } as unknown as jest.Mocked<ITransactionRunner>;
    service = new EnrollmentService(enrollmentRepository, studentRepository, transactions);
  });

  describe('createEnrollmentRequest (E2, une seule inscription active — D-22)', () => {
    const otherSchool = 'school-2';

    it('crée la demande avec le users.id de l’appelant et le message', async () => {
      studentRepository.findByUserId.mockResolvedValue(null);
      enrollmentRepository.findActiveByStudent.mockResolvedValue(null);
      enrollmentRepository.create.mockResolvedValue(pending);

      const result = await service.createEnrollmentRequest(userId, schoolId, 'Bonjour');

      expect(studentRepository.findByUserId).toHaveBeenCalledWith(userId);
      expect(enrollmentRepository.findActiveByStudent).toHaveBeenCalledWith(userId);
      expect(enrollmentRepository.create).toHaveBeenCalledWith(userId, schoolId, 'Bonjour');
      expect(result).toEqual(pending);
    });

    it('409 CONFLICT si l’élève est déjà inscrit — dans cette école ou dans une autre', async () => {
      studentRepository.findByUserId.mockResolvedValue(student);
      await expect(service.createEnrollmentRequest(userId, schoolId)).rejects.toMatchObject({
        status: 409,
        code: 'CONFLICT',
        message: 'Vous êtes déjà inscrit dans cette école',
      });

      studentRepository.findByUserId.mockResolvedValue({ ...student, schoolId: otherSchool });
      await expect(service.createEnrollmentRequest(userId, schoolId)).rejects.toMatchObject({
        status: 409,
        message: 'Vous êtes déjà inscrit dans une autre école',
      });
      expect(enrollmentRepository.create).not.toHaveBeenCalled();
    });

    it('409 CONFLICT si une demande est déjà pending, quelle que soit l’école', async () => {
      studentRepository.findByUserId.mockResolvedValue(null);
      enrollmentRepository.findActiveByStudent.mockResolvedValue(pending);
      await expect(service.createEnrollmentRequest(userId, schoolId)).rejects.toMatchObject({
        status: 409,
        message: 'Une demande est déjà en attente pour cette école',
      });

      enrollmentRepository.findActiveByStudent.mockResolvedValue({
        ...pending,
        schoolId: otherSchool,
      });
      await expect(service.createEnrollmentRequest(userId, schoolId)).rejects.toMatchObject({
        status: 409,
        message: 'Une demande est déjà en attente dans une autre école',
      });
    });

    it('409 CONFLICT si une demande est déjà approved', async () => {
      studentRepository.findByUserId.mockResolvedValue(null);
      enrollmentRepository.findActiveByStudent.mockResolvedValue({
        ...pending,
        status: 'approved',
      });

      await expect(service.createEnrollmentRequest(userId, schoolId)).rejects.toMatchObject({
        status: 409,
        message: 'Votre inscription est déjà approuvée',
      });
    });

    it('autorise une nouvelle demande après un refus (aucune demande active)', async () => {
      studentRepository.findByUserId.mockResolvedValue(null);
      enrollmentRepository.findActiveByStudent.mockResolvedValue(null);
      enrollmentRepository.create.mockResolvedValue(pending);

      await expect(service.createEnrollmentRequest(userId, schoolId)).resolves.toEqual(pending);
    });

    it('deux demandes simultanées : la violation d’unicité (23505) devient un 409', async () => {
      studentRepository.findByUserId.mockResolvedValue(null);
      enrollmentRepository.findActiveByStudent.mockResolvedValue(null);
      enrollmentRepository.create.mockRejectedValue(
        Object.assign(new Error('duplicate key value'), { code: '23505' })
      );

      await expect(service.createEnrollmentRequest(userId, schoolId)).rejects.toMatchObject({
        status: 409,
        code: 'CONFLICT',
      });

      enrollmentRepository.create.mockRejectedValue(new Error('connexion perdue'));
      await expect(service.createEnrollmentRequest(userId, schoolId)).rejects.toThrow(
        'connexion perdue'
      );
    });
  });

  describe('approveRequest (E5)', () => {
    it('passe la demande en approved puis crée la ligne students, dans une même transaction', async () => {
      enrollmentRepository.findById.mockResolvedValue(pending);
      enrollmentRepository.updateStatus.mockResolvedValue({ ...pending, status: 'approved' });
      studentRepository.create.mockResolvedValue(student);

      const result = await service.approveRequest('req-1', instructorId);

      expect(transactions.run).toHaveBeenCalledTimes(1);
      expect(enrollmentRepository.updateStatus).toHaveBeenCalledWith(
        'req-1',
        'approved',
        instructorId,
        undefined,
        tx
      );
      expect(studentRepository.create).toHaveBeenCalledWith(
        { userId, schoolId, authorized: true, enrollmentRequestId: 'req-1' },
        tx
      );
      expect(result.status).toBe('approved');
    });

    it("l'INSERT students échoue → rollback, la demande reste pending (COMMIT jamais émis)", async () => {
      // Repositories réels + PgTransactionRunner sur un client pg mocké dont le second appel
      // métier (INSERT students) rejette.
      const insertFailure = new Error('insert or update on table "students" violates foreign key');
      const clientQuery = jest
        .fn()
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [{ ...pending, status: 'approved' }] }) // UPDATE
        .mockRejectedValueOnce(insertFailure) // INSERT students
        .mockResolvedValueOnce({ rows: [] }); // ROLLBACK
      const release = jest.fn();
      const client = { query: clientQuery, release } as unknown as PoolClient;
      const pool = {
        query: jest.fn().mockResolvedValue({ rows: [pending] }), // findById, hors transaction
        connect: jest.fn().mockResolvedValue(client),
      } as unknown as Pool;
      const realService = new EnrollmentService(
        new EnrollmentRepository(pool),
        new StudentRepository(pool),
        new PgTransactionRunner(pool)
      );

      await expect(realService.approveRequest('req-1', instructorId)).rejects.toBe(insertFailure);

      const statements = clientQuery.mock.calls.map((call) => String((call as [string])[0]));
      expect(statements[0]).toBe('BEGIN');
      expect(statements[1]).toMatch(/UPDATE enrollment_requests/);
      expect(statements[2]).toMatch(/INSERT INTO students/);
      expect(statements[3]).toBe('ROLLBACK');
      expect(statements).not.toContain('COMMIT');
      expect(release).toHaveBeenCalledTimes(1);
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
