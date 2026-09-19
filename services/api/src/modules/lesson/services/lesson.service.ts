import { SchoolGuard } from '../../../http/authz';
import { HttpError } from '../../../http/errors';
import { AuthUser, UserRole } from '../../../types/auth';
import { LessonType } from '../../../types/domain';
import { ILessonRepository } from '../repositories/lesson.repository';
import {
  ApproveLessonDTO,
  CancelLessonDTO,
  Lesson,
  LessonFilters,
  LessonScope,
  LessonStatus,
  RejectLessonDTO,
  RequestLessonDTO,
} from '../types/lesson.types';

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

/** Ce que le module attend du module school : la grille tarifaire (D-30). */
export interface PricingLookup {
  getPricingByType(schoolId: string, lessonType: LessonType): Promise<{ price: number } | null>;
}

/**
 * Leçons selon D-01 / D-21 / D-32 : l'élève demande (L2), l'école voit la file partagée et
 * l'instructeur qui approuve devient l'instructeur de la leçon (L5). Cloisonnement D-20.
 */
export class LessonService {
  constructor(
    private readonly lessonRepository: ILessonRepository,
    private readonly students: StudentLookup,
    private readonly instructors: InstructorLookup,
    private readonly pricing: PricingLookup,
    private readonly schoolGuard: SchoolGuard,
    /** Fenêtre d'annulation par l'élève d'une leçon planifiée, en heures (D-24). */
    private readonly cancelWindowHours: number
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
    const lesson = await this.requireLesson(id);
    if (caller.role === UserRole.STUDENT) {
      this.assertOwner(caller, lesson);
      return lesson;
    }
    await this.schoolGuard.assertSameSchool(caller, lesson.schoolId);
    return lesson;
  }

  /**
   * L5 : tout instructeur de l'école ; il devient l'instructeur de la leçon (D-32). Prix figé
   * (D-30) : la grille de l'école prime, sinon le prix saisi, sinon 400 PRICE_REQUIRED.
   */
  async approveLesson(caller: AuthUser, id: string, dto: ApproveLessonDTO): Promise<Lesson> {
    const lesson = await this.requireLesson(id);
    const instructor = await this.instructors.findByUserId(caller.userId);
    if (!instructor) {
      throw new HttpError(
        403,
        'FORBIDDEN_SCHOOL',
        'Aucune école rattachée à ce compte instructeur'
      );
    }
    if (instructor.schoolId !== lesson.schoolId) {
      throw new HttpError(403, 'FORBIDDEN_SCHOOL', "Cette leçon n'appartient pas à votre école");
    }
    this.assertPending(lesson, 'approuvée');

    const grid = await this.pricing.getPricingByType(lesson.schoolId, lesson.type);
    const price = grid?.price ?? dto.price;
    if (price === undefined) {
      throw new HttpError(
        400,
        'PRICE_REQUIRED',
        `Aucun tarif ${lesson.type} dans la grille de l'école : indiquez un prix`
      );
    }

    const approved = await this.lessonRepository.approve(id, {
      instructorId: instructor.id,
      scheduledDate: dto.scheduledDate,
      durationMinutes: dto.durationMinutes,
      price,
      adminNotes: dto.adminNotes,
    });
    if (!approved) {
      throw new HttpError(409, 'CONFLICT', 'Cette demande vient d’être traitée par un collègue');
    }
    return approved;
  }

  /** L6 : instructeur de l'école ou admin ; motif 10–500 caractères (D-29, validé par Joi). */
  async rejectLesson(caller: AuthUser, id: string, dto: RejectLessonDTO): Promise<Lesson> {
    const lesson = await this.requireLesson(id);
    await this.schoolGuard.assertSameSchool(caller, lesson.schoolId);
    this.assertPending(lesson, 'refusée');

    const rejected = await this.lessonRepository.reject(id, dto.reason);
    if (!rejected) {
      throw new HttpError(409, 'CONFLICT', 'Cette demande vient d’être traitée par un collègue');
    }
    return rejected;
  }

  /**
   * L3 (D-24) : l'élève annule sa demande `pending` à tout moment et sa leçon `scheduled` jusqu'à
   * `cancelWindowHours` avant `scheduledDate` (403 CANCEL_WINDOW_CLOSED après) ; un instructeur
   * annule toute leçon `pending` ou `scheduled` de son école, sans fenêtre ; l'admin aussi.
   * Sort d'une leçon déjà payée : Q-17 — aucune règle particulière ici.
   */
  async cancelLesson(caller: AuthUser, id: string, dto: CancelLessonDTO): Promise<Lesson> {
    const lesson = await this.requireLesson(id);
    if (lesson.status !== LessonStatus.PENDING && lesson.status !== LessonStatus.SCHEDULED) {
      throw new HttpError(
        409,
        'CONFLICT',
        'Seule une demande en attente ou une leçon planifiée peut être annulée'
      );
    }
    if (caller.role === UserRole.STUDENT) {
      this.assertOwner(caller, lesson);
      if (lesson.status === LessonStatus.SCHEDULED) {
        this.assertCancelWindowOpen(lesson);
      }
    } else {
      await this.schoolGuard.assertSameSchool(caller, lesson.schoolId);
    }

    const cancelled = await this.lessonRepository.cancel(id, caller.userId, dto.reason);
    if (!cancelled) {
      throw new HttpError(409, 'CONFLICT', 'Le statut de cette leçon vient de changer');
    }
    return cancelled;
  }

  private assertCancelWindowOpen(lesson: Lesson): void {
    const scheduledAt = lesson.scheduledDate ? new Date(lesson.scheduledDate).getTime() : 0;
    const windowMs = this.cancelWindowHours * 3600 * 1000;
    if (scheduledAt - Date.now() < windowMs) {
      throw new HttpError(
        403,
        'CANCEL_WINDOW_CLOSED',
        `Une leçon planifiée ne peut plus être annulée moins de ${this.cancelWindowHours} h avant son début : contactez votre auto-école`
      );
    }
  }

  private assertOwner(caller: AuthUser, lesson: Lesson): void {
    if (lesson.studentId !== caller.userId) {
      throw new HttpError(403, 'FORBIDDEN', "Cette leçon n'est pas la vôtre");
    }
  }

  private assertPending(lesson: Lesson, action: string): void {
    if (lesson.status !== LessonStatus.PENDING) {
      throw new HttpError(409, 'CONFLICT', `Seule une demande en attente peut être ${action}`);
    }
  }

  private async requireLesson(id: string): Promise<Lesson> {
    const lesson = await this.lessonRepository.findById(id);
    if (!lesson) {
      throw new HttpError(404, 'NOT_FOUND', 'Leçon introuvable');
    }
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
