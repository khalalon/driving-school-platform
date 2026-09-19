import { SchoolGuard } from '../../../http/authz';
import { HttpError } from '../../../http/errors';
import { AuthUser, UserRole } from '../../../types/auth';
import { ILessonRepository } from '../repositories/lesson.repository';
import { Lesson, LessonFilters, LessonScope, RequestLessonDTO } from '../types/lesson.types';

/** Ce que le module attend du module student : la fiche `students` d'un compte (unique, D-22). */
export interface StudentLookup {
  findByUserId(
    userId: string
  ): Promise<{ id: string; schoolId: string; authorized: boolean } | null>;
}

/** Ce que le module attend du module school : les fiches instructeur. */
export interface InstructorLookup {
  findById(id: string): Promise<{ id: string; schoolId: string } | null>;
  findByUserId(userId: string): Promise<{ id: string; schoolId: string } | null>;
}

/**
 * Leçons selon D-01 / D-21 / D-32 : l'élève demande (L2), l'école voit la file partagée et
 * l'instructeur qui approuve devient l'instructeur de la leçon (5.3). Cloisonnement D-20.
 */
export class LessonService {
  constructor(
    private readonly lessonRepository: ILessonRepository,
    private readonly students: StudentLookup,
    private readonly instructors: InstructorLookup,
    private readonly schoolGuard: SchoolGuard
  ) {}

  /** L2 : école résolue depuis l'inscription approuvée de l'élève ; 403 NOT_ENROLLED sinon. */
  async requestLesson(caller: AuthUser, dto: RequestLessonDTO): Promise<Lesson> {
    const student = await this.students.findByUserId(caller.userId);
    if (!student?.authorized) {
      throw new HttpError(
        403,
        'NOT_ENROLLED',
        'Vous devez être inscrit et approuvé dans une école pour demander une leçon'
      );
    }
    if (dto.preferredInstructorId) {
      const preferred = await this.instructors.findById(dto.preferredInstructorId);
      if (!preferred || preferred.schoolId !== student.schoolId) {
        throw new HttpError(
          400,
          'VALIDATION_ERROR',
          "Données invalides : l'instructeur choisi n'appartient pas à votre école"
        );
      }
    }
    return this.lessonRepository.createRequest({
      ...dto,
      studentRowId: student.id,
      schoolId: student.schoolId,
    });
  }

  /** L1 : les leçons de l'appelant (élève : les siennes ; instructeur : selon `scope`). */
  async listLessons(caller: AuthUser, filters: LessonFilters): Promise<Lesson[]> {
    return this.lessonRepository.findAll(await this.resolveScope(caller, filters.scope), filters);
  }

  /** `GET /:id` : sa propre leçon pour un élève, celles de son école pour un instructeur. */
  async getLesson(caller: AuthUser, id: string): Promise<Lesson> {
    const lesson = await this.lessonRepository.findById(id);
    if (!lesson) {
      throw new HttpError(404, 'NOT_FOUND', 'Leçon introuvable');
    }
    if (caller.role === UserRole.STUDENT) {
      if (lesson.studentId !== caller.userId) {
        throw new HttpError(403, 'FORBIDDEN', "Cette leçon n'est pas la vôtre");
      }
      return lesson;
    }
    await this.schoolGuard.assertSameSchool(caller, lesson.schoolId);
    return lesson;
  }

  private async resolveScope(
    caller: AuthUser,
    scope: LessonFilters['scope']
  ): Promise<LessonScope> {
    if (caller.role === UserRole.STUDENT) {
      const student = await this.students.findByUserId(caller.userId);
      // Sans fiche students, l'élève n'a aucune leçon : identifiant impossible → liste vide.
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
      return {
        kind: 'instructor',
        instructorId: instructor.id,
        schoolId: instructor.schoolId,
        scope: scope ?? 'both',
      };
    }
    return { kind: 'all' };
  }
}
