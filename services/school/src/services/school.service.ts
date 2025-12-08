import { ISchoolRepository } from '../repositories/school.repository';
import { School, CreateSchoolDTO, UpdateSchoolDTO } from '../types';

export class SchoolService {
  constructor(private readonly schoolRepository: ISchoolRepository) {}

  async createSchool(dto: CreateSchoolDTO): Promise<School> {
    return this.schoolRepository.create(dto);
  }

  async getSchoolById(id: string): Promise<School> {
    const school = await this.schoolRepository.findById(id);
    if (!school) {
      throw new Error('School not found');
    }
    return school;
  }

  async getAllSchools(): Promise<School[]> {
    return this.schoolRepository.findAll();
  }

  async updateSchool(id: string, dto: UpdateSchoolDTO): Promise<School> {
    const school = await this.schoolRepository.findById(id);
    if (!school) {
      throw new Error('School not found');
    }
    return this.schoolRepository.update(id, dto);
  }

  async deleteSchool(id: string): Promise<void> {
    const school = await this.schoolRepository.findById(id);
    if (!school) {
      throw new Error('School not found');
    }
    await this.schoolRepository.delete(id);
  }
}
