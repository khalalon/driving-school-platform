import { Request, Response } from 'express';
import { RegistrationService } from '../services/registration.service';
import { registerForExamSchema, recordResultSchema } from '../validators/exam.validator';
import { ExamType } from '../types';

export class RegistrationController {
  constructor(private readonly registrationService: RegistrationService) {}

  registerForExam = async (req: Request, res: Response): Promise<void> => {
    try {
      const { examId } = req.params;
      const { error, value } = registerForExamSchema.validate(req.body);
      if (error) {
        res.status(400).json({ error: error.details[0].message });
        return;
      }

      const registration = await this.registrationService.registerForExam(examId, value.studentId);
      res.status(201).json(registration);
    } catch (err) {
      const error = err as Error;
      res.status(400).json({ error: error.message });
    }
  };

  getRegistration = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const registration = await this.registrationService.getRegistrationById(id);
      res.status(200).json(registration);
    } catch (err) {
      const error = err as Error;
      res.status(404).json({ error: error.message });
    }
  };

  getRegistrationsByExam = async (req: Request, res: Response): Promise<void> => {
    try {
      const { examId } = req.params;
      const registrations = await this.registrationService.getRegistrationsByExam(examId);
      res.status(200).json(registrations);
    } catch (err) {
      const error = err as Error;
      res.status(400).json({ error: error.message });
    }
  };

  getRegistrationsByStudent = async (req: Request, res: Response): Promise<void> => {
    try {
      const { studentId } = req.params;
      const registrations = await this.registrationService.getRegistrationsByStudent(studentId);
      res.status(200).json(registrations);
    } catch (err) {
      const error = err as Error;
      res.status(400).json({ error: error.message });
    }
  };

  recordResult = async (req: Request, res: Response): Promise<void> => {
    try {
      const { registrationId } = req.params;
      const { error, value } = recordResultSchema.validate(req.body);
      if (error) {
        res.status(400).json({ error: error.details[0].message });
        return;
      }

      const registration = await this.registrationService.recordResult(registrationId, value);
      res.status(200).json(registration);
    } catch (err) {
      const error = err as Error;
      res.status(400).json({ error: error.message });
    }
  };

  cancelRegistration = async (req: Request, res: Response): Promise<void> => {
    try {
      const { registrationId } = req.params;
      await this.registrationService.cancelRegistration(registrationId);
      res.status(200).json({ message: 'Registration cancelled successfully' });
    } catch (err) {
      const error = err as Error;
      res.status(400).json({ error: error.message });
    }
  };

  checkEligibility = async (req: Request, res: Response): Promise<void> => {
    try {
      const { studentId } = req.params;
      const { type } = req.query;

      if (!type || !Object.values(ExamType).includes(type as ExamType)) {
        res.status(400).json({ error: 'Valid exam type is required' });
        return;
      }

      const eligibility = await this.registrationService.checkEligibility(
        studentId,
        type as ExamType
      );
      res.status(200).json(eligibility);
    } catch (err) {
      const error = err as Error;
      res.status(400).json({ error: error.message });
    }
  };
}
