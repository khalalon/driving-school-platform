import { Response } from 'express';
import { sendCaughtError, sendValidationError } from '../../../http/errors';
import { uuidParam, validate } from '../../../http/validation';
import { AuthRequest, getAuthUser } from '../../../middleware/auth.middleware';
import { ProfileService } from '../services/profile.service';
import { markPaidSchema, updateNotesSchema } from '../validators/student.validator';

/**
 * Fiches élève : vue instructeur (`/api/profiles`, P1–P7) et vue élève de sa propre fiche
 * (`/api/student-profiles/me`, P8–P11). `:studentId` = students.id aujourd'hui (5.0 → users.id).
 */
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  getCompleteProfile = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { studentId, schoolId } = this.profileParams(req);
      res.json(await this.profileService.getCompleteProfile(studentId, schoolId));
    } catch (err) {
      sendCaughtError(res, err);
    }
  };

  getStudentLessons = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { studentId, schoolId } = this.profileParams(req);
      res.json(await this.profileService.getStudentLessons(studentId, schoolId));
    } catch (err) {
      sendCaughtError(res, err);
    }
  };

  getStudentExams = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { studentId, schoolId } = this.profileParams(req);
      res.json(await this.profileService.getStudentExams(studentId, schoolId));
    } catch (err) {
      sendCaughtError(res, err);
    }
  };

  getFinancialSummary = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { studentId, schoolId } = this.profileParams(req);
      res.json(await this.profileService.getFinancialSummary(studentId, schoolId));
    } catch (err) {
      sendCaughtError(res, err);
    }
  };

  updateNotes = async (req: AuthRequest, res: Response): Promise<void> => {
    const parsed = validate(updateNotesSchema, req.body);
    if (!parsed.ok) {
      sendValidationError(res, parsed.detail);
      return;
    }
    try {
      const studentId = uuidParam(req.params.studentId, 'Élève');
      await this.profileService.updateInstructorNotes(studentId, parsed.value.notes);
      res.status(204).send();
    } catch (err) {
      sendCaughtError(res, err);
    }
  };

  markLessonPaid = async (req: AuthRequest, res: Response): Promise<void> => {
    const parsed = validate(markPaidSchema, req.body);
    if (!parsed.ok) {
      sendValidationError(res, parsed.detail);
      return;
    }
    try {
      const bookingId = uuidParam(req.params.bookingId, 'Réservation');
      await this.profileService.markLessonPaid(
        bookingId,
        parsed.value.amount,
        parsed.value.paymentMethod
      );
      res.status(204).send();
    } catch (err) {
      sendCaughtError(res, err);
    }
  };

  markExamPaid = async (req: AuthRequest, res: Response): Promise<void> => {
    const parsed = validate(markPaidSchema, req.body);
    if (!parsed.ok) {
      sendValidationError(res, parsed.detail);
      return;
    }
    try {
      const registrationId = uuidParam(req.params.registrationId, "Inscription à l'examen");
      await this.profileService.markExamPaid(
        registrationId,
        parsed.value.amount,
        parsed.value.paymentMethod
      );
      res.status(204).send();
    } catch (err) {
      sendCaughtError(res, err);
    }
  };

  // --- Vue élève : l'identifiant vient du jeton ---

  getMyProfile = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const schoolId = uuidParam(req.params.schoolId, 'École');
      res.json(await this.profileService.getOwnProfile(getAuthUser(req).userId, schoolId));
    } catch (err) {
      sendCaughtError(res, err);
    }
  };

  getMyLessons = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const schoolId = uuidParam(req.params.schoolId, 'École');
      res.json(await this.profileService.getStudentLessons(getAuthUser(req).userId, schoolId));
    } catch (err) {
      sendCaughtError(res, err);
    }
  };

  getMyExams = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const schoolId = uuidParam(req.params.schoolId, 'École');
      res.json(await this.profileService.getStudentExams(getAuthUser(req).userId, schoolId));
    } catch (err) {
      sendCaughtError(res, err);
    }
  };

  getMyFinancialSummary = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const schoolId = uuidParam(req.params.schoolId, 'École');
      res.json(await this.profileService.getFinancialSummary(getAuthUser(req).userId, schoolId));
    } catch (err) {
      sendCaughtError(res, err);
    }
  };

  private profileParams(req: AuthRequest): { studentId: string; schoolId: string } {
    return {
      studentId: uuidParam(req.params.studentId, 'Élève'),
      schoolId: uuidParam(req.params.schoolId, 'École'),
    };
  }
}
