/**
 * Profile Controller
 * Single Responsibility: Handle student profile HTTP requests
 * SOLID: Depends on ProfileService abstraction
 */

import { Response } from 'express';
import { ProfileService } from '../services/profile.service';
import { AuthRequest } from '../middleware/auth.middleware';

export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  getCompleteProfile = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { studentId, schoolId } = req.params;
      const profile = await this.profileService.getCompleteProfile(studentId, schoolId);
      res.json(profile);
    } catch (error: any) {
      res.status(404).json({ error: error.message });
    }
  };

  getStudentLessons = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { studentId, schoolId } = req.params;
      const lessons = await this.profileService.getStudentLessons(studentId, schoolId);
      res.json(lessons);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  };

  getStudentExams = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { studentId, schoolId } = req.params;
      const exams = await this.profileService.getStudentExams(studentId, schoolId);
      res.json(exams);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  };

  getFinancialSummary = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { studentId, schoolId } = req.params;
      const summary = await this.profileService.getFinancialSummary(studentId, schoolId);
      res.json(summary);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  };

  updateNotes = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { studentId } = req.params;
      const { notes } = req.body;

      await this.profileService.updateInstructorNotes(studentId, notes);
      res.json({ success: true, message: 'Notes updated successfully' });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  };

  markLessonPaid = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { bookingId } = req.params;
      const { amount, paymentMethod } = req.body;

      await this.profileService.markLessonPaid(bookingId, amount, paymentMethod);
      res.json({ success: true, message: 'Lesson marked as paid' });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  };

  markExamPaid = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { registrationId } = req.params;
      const { amount, paymentMethod } = req.body;

      await this.profileService.markExamPaid(registrationId, amount, paymentMethod);
      res.json({ success: true, message: 'Exam marked as paid' });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  };

  getMyProfile = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const studentId = req.user!.userId; // From JWT token
      const { schoolId } = req.params;
      
      const profile = await this.profileService.getCompleteProfile(studentId, schoolId);
      
      // Remove instructor private notes
      delete profile.notes;
      
      res.json(profile);
    } catch (error: any) {
      res.status(404).json({ error: error.message });
    }
  };

  getMyLessons = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const studentId = req.user!.userId;
      const { schoolId } = req.params;
      
      const lessons = await this.profileService.getStudentLessons(studentId, schoolId);
      res.json(lessons);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  };

  getMyExams = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const studentId = req.user!.userId;
      const { schoolId } = req.params;
      
      const exams = await this.profileService.getStudentExams(studentId, schoolId);
      res.json(exams);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  };

  getMyFinancialSummary = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const studentId = req.user!.userId;
      const { schoolId } = req.params;
      
      const summary = await this.profileService.getFinancialSummary(studentId, schoolId);
      res.json(summary);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  };
}
