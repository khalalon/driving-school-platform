import { HttpError } from '../../../http/errors';
import { IInstructorRepository } from '../repositories/instructor.repository';
import { CreateInstructorDTO, Instructor, UpdateInstructorDTO } from '../types/school.types';

export class InstructorService {
  constructor(private readonly instructorRepository: IInstructorRepository) {}

  addInstructor(schoolId: string, dto: CreateInstructorDTO): Promise<Instructor> {
    return this.instructorRepository.create(schoolId, dto);
  }

  async getInstructorById(id: string): Promise<Instructor> {
    const instructor = await this.instructorRepository.findById(id);
    if (!instructor) {
      throw new HttpError(404, 'NOT_FOUND', 'Instructeur introuvable');
    }
    return instructor;
  }

  getInstructorsBySchool(schoolId: string): Promise<Instructor[]> {
    return this.instructorRepository.findBySchoolId(schoolId);
  }

  async updateInstructor(id: string, dto: UpdateInstructorDTO): Promise<Instructor> {
    await this.getInstructorById(id);
    return this.instructorRepository.update(id, dto);
  }

  async deleteInstructor(id: string): Promise<void> {
    await this.getInstructorById(id);
    await this.instructorRepository.delete(id);
  }
}
