import { AuthUser, UserRole } from '../types/auth';
import { HttpError } from './errors';

/** Ce que le cloisonnement attend du module school : l'école d'un instructeur (par users.id). */
export interface InstructorSchoolLookup {
  findByUserId(userId: string): Promise<{ id: string; schoolId: string } | null>;
}

/**
 * Cloisonnement par école (D-20) : un `instructor` n'agit que sur les ressources de son école,
 * un `admin` sur tout. Vérifié dans la couche service, avec `instructors.school_id` de l'appelant.
 */
export class SchoolGuard {
  constructor(private readonly instructors: InstructorSchoolLookup) {}

  /** 403 FORBIDDEN_SCHOOL si l'appelant est un instructeur d'une autre école ; l'admin passe. */
  async assertSameSchool(user: AuthUser, schoolId: string): Promise<void> {
    if (user.role === UserRole.ADMIN) {
      return;
    }
    const own = await this.requireSchool(user);
    if (own !== schoolId) {
      throw new HttpError(
        403,
        'FORBIDDEN_SCHOOL',
        "Cette ressource n'appartient pas à votre école"
      );
    }
  }

  /** École de l'appelant instructeur (routes sans `schoolId`) ; l'admin n'en a pas → 403. */
  async requireSchool(user: AuthUser): Promise<string> {
    if (user.role !== UserRole.INSTRUCTOR) {
      throw new HttpError(
        403,
        'FORBIDDEN_SCHOOL',
        'Action réservée à un instructeur rattaché à une école'
      );
    }
    const instructor = await this.instructors.findByUserId(user.userId);
    if (!instructor) {
      throw new HttpError(
        403,
        'FORBIDDEN_SCHOOL',
        'Aucune école rattachée à ce compte instructeur'
      );
    }
    return instructor.schoolId;
  }
}
