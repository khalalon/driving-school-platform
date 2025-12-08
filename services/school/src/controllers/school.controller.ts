import { Request, Response } from 'express';
import { SchoolService } from '../services/school.service';
import { createSchoolSchema, updateSchoolSchema } from '../validators/school.validator';

export class SchoolController {
  constructor(private readonly schoolService: SchoolService) {}

  createSchool = async (req: Request, res: Response) => {
    const { error, value } = createSchoolSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.message });

    try {
      const school = await this.schoolService.createSchool(value);
      res.status(201).json(school);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  };

  getAllSchools = async (_req: Request, res: Response) => {
    try {
      const schools = await this.schoolService.getAllSchools();
      res.json(schools);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  };

  getSchoolById = async (req: Request, res: Response) => {
    try {
      const school = await this.schoolService.getSchoolById(req.params.id);
      res.json(school);
    } catch (err: any) {
      res.status(404).json({ error: err.message });
    }
  };

  updateSchool = async (req: Request, res: Response) => {
    const { error, value } = updateSchoolSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.message });

    try {
      const school = await this.schoolService.updateSchool(req.params.id, value);
      res.json(school);
    } catch (err: any) {
      res.status(404).json({ error: err.message });
    }
  };

  deleteSchool = async (req: Request, res: Response) => {
    try {
      await this.schoolService.deleteSchool(req.params.id);
      res.status(204).send();
    } catch (err: any) {
      res.status(404).json({ error: err.message });
    }
  };
}
