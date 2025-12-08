import { Request, Response } from 'express';
import { InstructorService } from '../services/instructor.service';
import { createInstructorSchema, updateInstructorSchema } from '../validators/school.validator';

export class InstructorController {
  constructor(private readonly instructorService: InstructorService) {}

  addInstructor = async (req: Request, res: Response) => {
    const { error, value } = createInstructorSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.message });

    try {
      const instructor = await this.instructorService.addInstructor(req.params.schoolId, value);
      res.status(201).json(instructor);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  };

  getInstructorsBySchool = async (req: Request, res: Response) => {
    try {
      const instructors = await this.instructorService.getInstructorsBySchool(req.params.schoolId);
      res.json(instructors);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  };

  getInstructorById = async (req: Request, res: Response) => {
    try {
      const instructor = await this.instructorService.getInstructorById(req.params.id);
      res.json(instructor);
    } catch (err: any) {
      res.status(404).json({ error: err.message });
    }
  };

  updateInstructor = async (req: Request, res: Response) => {
    const { error, value } = updateInstructorSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.message });

    try {
      const instructor = await this.instructorService.updateInstructor(req.params.id, value);
      res.json(instructor);
    } catch (err: any) {
      res.status(404).json({ error: err.message });
    }
  };

  deleteInstructor = async (req: Request, res: Response) => {
    try {
      await this.instructorService.deleteInstructor(req.params.id);
      res.status(204).send();
    } catch (err: any) {
      res.status(404).json({ error: err.message });
    }
  };
}
