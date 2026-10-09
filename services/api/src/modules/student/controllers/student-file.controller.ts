import { Response } from 'express';
import { sendCaughtError, sendValidationError } from '../../../http/errors';
import { uuidParam, validate } from '../../../http/validation';
import { AuthRequest, getAuthUser } from '../../../middleware/auth.middleware';
import { StudentFileService } from '../services/student-file.service';
import { setDocumentReceivedSchema } from '../validators/student.validator';

/**
 * Dossier administratif (F5–F7, D-61) : vue école sur `/api/profiles`, vue élève sur
 * `/api/student-profiles/me`. `:studentId` = users.id (D-28) ; cloisonnement dans le service.
 */
export class StudentFileController {
  constructor(private readonly studentFileService: StudentFileService) {}

  /** F5 */
  getStudentFile = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const studentId = uuidParam(req.params.studentId, 'Élève');
      const schoolId = uuidParam(req.params.schoolId, 'École');
      res.json(await this.studentFileService.getStudentFile(getAuthUser(req), studentId, schoolId));
    } catch (err) {
      sendCaughtError(res, err);
    }
  };

  /** F6 */
  getMyFile = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const schoolId = uuidParam(req.params.schoolId, 'École');
      res.json(await this.studentFileService.getOwnFile(getAuthUser(req).userId, schoolId));
    } catch (err) {
      sendCaughtError(res, err);
    }
  };

  /** F7 */
  setDocumentReceived = async (req: AuthRequest, res: Response): Promise<void> => {
    const parsed = validate(setDocumentReceivedSchema, req.body);
    if (!parsed.ok) {
      sendValidationError(res, parsed.detail);
      return;
    }
    try {
      const studentId = uuidParam(req.params.studentId, 'Élève');
      const schoolId = uuidParam(req.params.schoolId, 'École');
      const documentTypeId = uuidParam(req.params.documentTypeId, 'Pièce');
      res.json(
        await this.studentFileService.setDocumentReceived(
          getAuthUser(req),
          studentId,
          schoolId,
          documentTypeId,
          parsed.value.received,
          parsed.value.note
        )
      );
    } catch (err) {
      sendCaughtError(res, err);
    }
  };
}
