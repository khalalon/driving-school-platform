import { SchoolGuard } from '../../../http/authz';
import { HttpError } from '../../../http/errors';
import { AuthUser, UserRole } from '../../../types/auth';
import { IExamRepository } from '../repositories/exam.repository';
import {
  Exam,
  ExamFilters,
  ExamScope,
  ExamStatus,
  RecordResultDTO,
  RejectExamDTO,
  RequestExamDTO,
  ScheduleExamDTO,
} from '../types/exam.types';

/** Ce que le module attend du module student : la fiche `students` d'un compte (unique, D-22). */
export interface StudentLookup {
  findByUserId(
    userId: string
  ): Promise<{ id: string; schoolId: string; authorized: boolean } | null>;
}

/** Ce que le module attend du module school : l'école d'un instructeur. */
export interface InstructorLookup {
  findByUserId(userId: string): Promise<{ id: string; schoolId: string } | null>;
}

/**
 * Examens selon D-01 / D-33 : l'élève demande (X2), toute l'école voit et agit (pas
 * d'instructeur attitré), sans règle d'éligibilité (D-26). Cloisonnement D-20.
 */
export class ExamService {
  constructor(
    private readonly examRepository: IExamRepository,
    private readonly students: StudentLookup,
    private readonly instructors: InstructorLookup,
    private readonly schoolGuard: SchoolGuard
  ) {}

  /** X2 : école résolue depuis l'inscription approuvée de l'élève ; 403 NOT_ENROLLED sinon. */
  async requestExam(caller: AuthUser, dto: RequestExamDTO): Promise<Exam> {
    const student = await this.students.findByUserId(caller.userId);
    if (!student?.authorized) {
      throw new HttpError(
        403,
        'NOT_ENROLLED',
        'Vous devez être inscrit et approuvé dans une école pour demander un examen'
      );
    }
    return this.examRepository.createRequest({
      ...dto,
      studentRowId: student.id,
      schoolId: student.schoolId,
    });
  }

  /** X1 : les examens de l'appelant (élève : les siens ; instructeur : tous ceux de son école). */
  async listExams(caller: AuthUser, filters: ExamFilters): Promise<Exam[]> {
    return this.examRepository.findAll(await this.resolveScope(caller), filters);
  }

  /** `GET /:id` : son propre examen pour un élève, ceux de son école pour un instructeur. */
  async getExam(caller: AuthUser, id: string): Promise<Exam> {
    const exam = await this.requireExam(id);
    if (caller.role === UserRole.STUDENT) {
      if (exam.studentId !== caller.userId) {
        throw new HttpError(403, 'FORBIDDEN', "Cet examen n'est pas le vôtre");
      }
      return exam;
    }
    await this.schoolGuard.assertSameSchool(caller, exam.schoolId);
    return exam;
  }

  /** X3 : instructeur de l'école (ou admin) ; `pending` → `scheduled`. Libellé écran : Q-19. */
  async scheduleExam(caller: AuthUser, id: string, dto: ScheduleExamDTO): Promise<Exam> {
    const exam = await this.requireSchoolExam(caller, id);
    this.assertStatus(exam, ExamStatus.PENDING, 'Seule une demande en attente peut être planifiée');
    const scheduled = await this.examRepository.schedule(id, dto);
    if (!scheduled) {
      throw new HttpError(409, 'CONFLICT', 'Cette demande vient d’être traitée par un collègue');
    }
    return scheduled;
  }

  /** X4 : instructeur de l'école (ou admin) ; `pending` → `rejected` (D-33). */
  async rejectExam(caller: AuthUser, id: string, dto: RejectExamDTO): Promise<Exam> {
    const exam = await this.requireSchoolExam(caller, id);
    this.assertStatus(exam, ExamStatus.PENDING, 'Seule une demande en attente peut être refusée');
    const rejected = await this.examRepository.reject(id, dto.reason);
    if (!rejected) {
      throw new HttpError(409, 'CONFLICT', 'Cette demande vient d’être traitée par un collègue');
    }
    return rejected;
  }

  /** X5 : instructeur de l'école (D-20) ; `scheduled` → `completed`, score facultatif (D-33). */
  async recordResult(caller: AuthUser, id: string, dto: RecordResultDTO): Promise<Exam> {
    const exam = await this.requireSchoolExam(caller, id);
    this.assertStatus(
      exam,
      ExamStatus.SCHEDULED,
      'Seul un examen planifié peut recevoir un résultat'
    );
    const completed = await this.examRepository.recordResult(id, dto);
    if (!completed) {
      throw new HttpError(409, 'CONFLICT', 'Le statut de cet examen vient de changer');
    }
    return completed;
  }

  /** L'examen existe et appartient à l'école de l'appelant (D-20). */
  private async requireSchoolExam(caller: AuthUser, id: string): Promise<Exam> {
    const exam = await this.requireExam(id);
    await this.schoolGuard.assertSameSchool(caller, exam.schoolId);
    return exam;
  }

  private assertStatus(exam: Exam, expected: ExamStatus, message: string): void {
    if (exam.status !== expected) {
      throw new HttpError(409, 'CONFLICT', message);
    }
  }

  private async requireExam(id: string): Promise<Exam> {
    const exam = await this.examRepository.findById(id);
    if (!exam) {
      throw new HttpError(404, 'NOT_FOUND', 'Examen introuvable');
    }
    return exam;
  }

  private async resolveScope(caller: AuthUser): Promise<ExamScope> {
    if (caller.role === UserRole.STUDENT) {
      const student = await this.students.findByUserId(caller.userId);
      // Sans fiche students, l'élève n'a aucun examen : identifiant impossible → liste vide.
      return {
        kind: 'student',
        studentRowId: student?.id ?? '00000000-0000-0000-0000-000000000000',
      };
    }
    if (caller.role === UserRole.INSTRUCTOR) {
      const instructor = await this.instructors.findByUserId(caller.userId);
      if (!instructor) {
        throw new HttpError(
          403,
          'FORBIDDEN_SCHOOL',
          'Aucune école rattachée à ce compte instructeur'
        );
      }
      return { kind: 'school', schoolId: instructor.schoolId };
    }
    return { kind: 'all' };
  }
}
