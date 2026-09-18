import { HttpError } from '../../../http/errors';
import { ISchoolRepository } from '../repositories/school.repository';
import { CreateSchoolDTO, School, UpdateSchoolDTO } from '../types/school.types';

export class SchoolService {
  constructor(private readonly schoolRepository: ISchoolRepository) {}

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
