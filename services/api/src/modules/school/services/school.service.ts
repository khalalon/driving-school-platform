import { SchoolGuard } from '../../../http/authz';
import { HttpError } from '../../../http/errors';
import { AuthUser } from '../../../types/auth';
import { ISchoolRepository } from '../repositories/school.repository';
import { CreateSchoolDTO, School, SchoolStudent, UpdateSchoolDTO } from '../types/school.types';

/** Ce que S6 attend du module student : les élèves autorisés d'une école (D-25). */
export interface SchoolRosterSource {
  listSchoolRoster(schoolId: string): Promise<SchoolStudent[]>;
}

export class SchoolService {
  constructor(
    private readonly schoolRepository: ISchoolRepository,
    private readonly roster: SchoolRosterSource,
    private readonly schoolGuard: SchoolGuard
  ) {}

  /** S6 : instructeur de cette école ou admin (D-20, D-25). */
  async getSchoolStudents(caller: AuthUser, schoolId: string): Promise<SchoolStudent[]> {
    await this.schoolGuard.assertSameSchool(caller, schoolId);
    await this.getSchoolById(schoolId);
    return this.roster.listSchoolRoster(schoolId);
  }

  createSchool(dto: CreateSchoolDTO): Promise<School> {
    return this.schoolRepository.create(dto);
  }

  async getSchoolById(id: string): Promise<School> {
    const school = await this.schoolRepository.findById(id);
    if (!school) {
      throw new HttpError(404, 'NOT_FOUND', 'École introuvable');
    }
    return school;
  }

  getAllSchools(): Promise<School[]> {
    return this.schoolRepository.findAll();
  }

  /**
   * S7 (D-51, puis D-56) : l'école est créée par l'administrateur ; son **gérant** corrige la
   * fiche depuis l'application. 403 FORBIDDEN_SCHOOL sur une autre école (D-20),
   * 403 FORBIDDEN_MANAGER pour un simple moniteur (14.3).
   */
  async updateSchool(caller: AuthUser, id: string, dto: UpdateSchoolDTO): Promise<School> {
    await this.schoolGuard.assertManager(caller, id);
    await this.getSchoolById(id);
    return this.schoolRepository.update(id, dto);
  }

  async deleteSchool(id: string): Promise<void> {
    await this.getSchoolById(id);
    await this.schoolRepository.delete(id);
  }
}
