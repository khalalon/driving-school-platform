import { ITransactionRunner } from '../../../db/transaction';
import { SchoolGuard } from '../../../http/authz';
import { HttpError } from '../../../http/errors';
import { AuthUser } from '../../../types/auth';
import { EnrollmentRequestStatus } from '../../../types/domain';
import { IEnrollmentRepository } from '../repositories/enrollment.repository';
import { IStudentRepository } from '../repositories/student.repository';
import { EnrollmentRequest, EnrollmentStatus } from '../types/student.types';

/**
 * Cycle d'inscription (D-09) : pending → approved | rejected. `studentId` = users.id.
 * L'approbation (UPDATE demande + INSERT students) est atomique (3.2). Une seule inscription
 * active par élève, toutes écoles confondues (D-22, index uniques de 009). E4–E6 sont cloisonnées à
 * l'école de l'instructeur (D-20, `SchoolGuard`).
 */
/** Code SQLSTATE 23505 (unique_violation) de node-postgres. */
const isUniqueViolation = (err: unknown): boolean =>
  typeof err === 'object' && err !== null && (err as { code?: unknown }).code === '23505';

export class EnrollmentService {
  constructor(
    private readonly enrollmentRepository: IEnrollmentRepository,
    private readonly studentRepository: IStudentRepository,
    private readonly transactions: ITransactionRunner,
    private readonly schoolGuard: SchoolGuard
  ) {}

  async createEnrollmentRequest(
    studentId: string,
    schoolId: string,
    message?: string
  ): Promise<EnrollmentRequest> {
    // D-22 : une seule inscription active, dans n'importe quelle école.
    const existingStudent = await this.studentRepository.findByUserId(studentId);
    if (existingStudent) {
      throw new HttpError(
        409,
        'CONFLICT',
        existingStudent.schoolId === schoolId
          ? 'Vous êtes déjà inscrit dans cette école'
          : 'Vous êtes déjà inscrit dans une autre école'
      );
    }

    const activeRequest = await this.enrollmentRepository.findActiveByStudent(studentId);
    if (activeRequest?.status === 'pending') {
      throw new HttpError(
        409,
        'CONFLICT',
        activeRequest.schoolId === schoolId
          ? 'Une demande est déjà en attente pour cette école'
          : 'Une demande est déjà en attente dans une autre école'
      );
    }
    if (activeRequest) {
      throw new HttpError(409, 'CONFLICT', 'Votre inscription est déjà approuvée');
    }

    try {
      return await this.enrollmentRepository.create(studentId, schoolId, message);
    } catch (err) {
      // Deux demandes simultanées : l'index unique partiel de 009 tranche, on répond 409.
      if (isUniqueViolation(err)) {
        throw new HttpError(409, 'CONFLICT', 'Une demande est déjà en attente');
      }
      throw err;
    }
  }

  getStudentRequests(studentId: string): Promise<EnrollmentRequest[]> {
    return this.enrollmentRepository.findByStudent(studentId);
  }

  /** E4 : instructeur de cette école ou admin (D-20). */
  async getSchoolRequests(
    caller: AuthUser,
    schoolId: string,
    status?: EnrollmentRequestStatus
  ): Promise<EnrollmentRequest[]> {
    await this.schoolGuard.assertSameSchool(caller, schoolId);
    return this.enrollmentRepository.findBySchool(schoolId, status);
  }

  /** E5 : instructeur de l'école de la demande ou admin (D-20). */
  async approveRequest(caller: AuthUser, requestId: string): Promise<EnrollmentRequest> {
    const request = await this.getPendingRequest(requestId);
    await this.schoolGuard.assertSameSchool(caller, request.schoolId);
    const processedBy = caller.userId;

    // Si l'INSERT échoue, le ROLLBACK laisse la demande en pending.
    return this.transactions.run(async (tx) => {
      const updatedRequest = await this.enrollmentRepository.updateStatus(
        requestId,
        'approved',
        processedBy,
        undefined,
        tx
      );
      await this.studentRepository.create(
        {
          userId: request.studentId,
          schoolId: request.schoolId,
          authorized: true,
          enrollmentRequestId: requestId,
        },
        tx
      );
      return updatedRequest;
    });
  }

  /** E6 : instructeur de l'école de la demande ou admin (D-20). */
  async rejectRequest(
    caller: AuthUser,
    requestId: string,
    reason: string
  ): Promise<EnrollmentRequest> {
    const request = await this.getPendingRequest(requestId);
    await this.schoolGuard.assertSameSchool(caller, request.schoolId);
    return this.enrollmentRepository.updateStatus(requestId, 'rejected', caller.userId, reason);
  }

  async getEnrollmentStatus(studentId: string, schoolId: string): Promise<EnrollmentStatus> {
    const student = await this.studentRepository.findByUserAndSchool(studentId, schoolId);
    if (student?.authorized) {
      return {
        isEnrolled: true,
        requestStatus: 'approved',
        enrollmentDate: student.enrollmentDate ?? student.createdAt,
        canBook: true,
      };
    }

    const request = await this.enrollmentRepository.findByStudentAndSchool(studentId, schoolId);
    if (request) {
      return { isEnrolled: false, requestStatus: request.status, canBook: false };
    }

    return { isEnrolled: false, canBook: false };
  }

  private async getPendingRequest(requestId: string): Promise<EnrollmentRequest> {
    const request = await this.enrollmentRepository.findById(requestId);
    if (!request) {
      throw new HttpError(404, 'NOT_FOUND', "Demande d'inscription introuvable");
    }
    if (request.status !== 'pending') {
      throw new HttpError(409, 'CONFLICT', 'Cette demande a déjà été traitée');
    }
    return request;
  }
}
