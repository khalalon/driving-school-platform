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

  async updateSchool(id: string, dto: UpdateSchoolDTO): Promise<School> {
    await this.getSchoolById(id);
    return this.schoolRepository.update(id, dto);
  }

  async deleteSchool(id: string): Promise<void> {
    await this.getSchoolById(id);
    await this.schoolRepository.delete(id);
  }
}
