import { IInstructorRepository } from '../repositories/instructor.repository';
import { Instructor, CreateInstructorDTO, UpdateInstructorDTO } from '../types';

export class InstructorService {
  constructor(private readonly instructorRepository: IInstructorRepository) {}

  async addInstructor(schoolId: string, dto: CreateInstructorDTO): Promise<Instructor> {
    return this.instructorRepository.create(schoolId, dto);
  }

  async getInstructorById(id: string): Promise<Instructor> {
    const instructor = await this.instructorRepository.findById(id);
    if (!instructor) {
      throw new Error('Instructor not found');
    }
    return instructor;
  }

  async getInstructorsBySchool(schoolId: string): Promise<Instructor[]> {
    return this.instructorRepository.findBySchoolId(schoolId);
  }

  async updateInstructor(id: string, dto: UpdateInstructorDTO): Promise<Instructor> {
    const instructor = await this.instructorRepository.findById(id);
    if (!instructor) {
      throw new Error('Instructor not found');
    }
    return this.instructorRepository.update(id, dto);
  }

  async deleteInstructor(id: string): Promise<void> {
    const instructor = await this.instructorRepository.findById(id);
    if (!instructor) {
      throw new Error('Instructor not found');
    }
    await this.instructorRepository.delete(id);
  }
}
