import { Request, Response } from 'express';
import { sendCaughtError, sendValidationError } from '../../../http/errors';
import { uuidParam, validate } from '../../../http/validation';
import { AuthRequest, getAuthUser } from '../../../middleware/auth.middleware';
import { DocumentTypeService } from '../services/document-type.service';
import { InstructorService } from '../services/instructor.service';
import { PricingService } from '../services/pricing.service';
import { SchoolService } from '../services/school.service';
import {
  createInstructorSchema,
  createSchoolSchema,
  documentTypeSchema,
  setPricingSchema,
  updateInstructorSchema,
  updateSchoolSchema,
} from '../validators/school.validator';

export class SchoolController {
  constructor(
    private readonly schoolService: SchoolService,
    private readonly instructorService: InstructorService,
    private readonly pricingService: PricingService,
    private readonly documentTypeService: DocumentTypeService
  ) {}

  // --- Écoles ---

  createSchool = async (req: Request, res: Response): Promise<void> => {
    const parsed = validate(createSchoolSchema, req.body);
    if (!parsed.ok) {
      sendValidationError(res, parsed.detail);
      return;
    }
    try {
      res.status(201).json(await this.schoolService.createSchool(parsed.value));
    } catch (err) {
      sendCaughtError(res, err);
    }
  };

  /** S6 */
  getSchoolStudents = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const schoolId = uuidParam(req.params.schoolId, 'École');
      res.json(await this.schoolService.getSchoolStudents(getAuthUser(req), schoolId));
    } catch (err) {
      sendCaughtError(res, err);
    }
  };

  getAllSchools = async (_req: Request, res: Response): Promise<void> => {
    try {
      res.json(await this.schoolService.getAllSchools());
    } catch (err) {
      sendCaughtError(res, err);
    }
  };

  getSchoolById = async (req: Request, res: Response): Promise<void> => {
    try {
      const id = uuidParam(req.params.id, 'École');
      res.json(await this.schoolService.getSchoolById(id));
    } catch (err) {
      sendCaughtError(res, err);
    }
  };

  updateSchool = async (req: Request, res: Response): Promise<void> => {
    const parsed = validate(updateSchoolSchema, req.body);
    if (!parsed.ok) {
      sendValidationError(res, parsed.detail);
      return;
    }
    try {
      const id = uuidParam(req.params.id, 'École');
      res.json(await this.schoolService.updateSchool(getAuthUser(req), id, parsed.value));
    } catch (err) {
      sendCaughtError(res, err);
    }
  };

  deleteSchool = async (req: Request, res: Response): Promise<void> => {
    try {
      const id = uuidParam(req.params.id, 'École');
      await this.schoolService.deleteSchool(id);
      res.status(204).send();
    } catch (err) {
      sendCaughtError(res, err);
    }
  };

  // --- Instructeurs ---

  addInstructor = async (req: Request, res: Response): Promise<void> => {
    const parsed = validate(createInstructorSchema, req.body);
    if (!parsed.ok) {
      sendValidationError(res, parsed.detail);
      return;
    }
    try {
      const schoolId = uuidParam(req.params.schoolId, 'École');
      await this.schoolService.getSchoolById(schoolId);
      res.status(201).json(await this.instructorService.addInstructor(schoolId, parsed.value));
    } catch (err) {
      sendCaughtError(res, err);
    }
  };

  getInstructorsBySchool = async (req: Request, res: Response): Promise<void> => {
    try {
      const schoolId = uuidParam(req.params.schoolId, 'École');
      res.json(await this.instructorService.getInstructorsBySchool(schoolId));
    } catch (err) {
      sendCaughtError(res, err);
    }
  };

  getInstructorById = async (req: Request, res: Response): Promise<void> => {
    try {
      const id = uuidParam(req.params.id, 'Instructeur');
      res.json(await this.instructorService.getInstructorById(id));
    } catch (err) {
      sendCaughtError(res, err);
    }
  };

  updateInstructor = async (req: Request, res: Response): Promise<void> => {
    const parsed = validate(updateInstructorSchema, req.body);
    if (!parsed.ok) {
      sendValidationError(res, parsed.detail);
      return;
    }
    try {
      const id = uuidParam(req.params.id, 'Instructeur');
      res.json(await this.instructorService.updateInstructor(id, parsed.value));
    } catch (err) {
      sendCaughtError(res, err);
    }
  };

  deleteInstructor = async (req: Request, res: Response): Promise<void> => {
    try {
      const id = uuidParam(req.params.id, 'Instructeur');
      await this.instructorService.deleteInstructor(id);
      res.status(204).send();
    } catch (err) {
      sendCaughtError(res, err);
    }
  };

  // --- Tarifs ---

  setPricing = async (req: Request, res: Response): Promise<void> => {
    const parsed = validate(setPricingSchema, req.body);
    if (!parsed.ok) {
      sendValidationError(res, parsed.detail);
      return;
    }
    try {
      const schoolId = uuidParam(req.params.schoolId, 'École');
      await this.schoolService.getSchoolById(schoolId);
      res
        .status(201)
        .json(await this.pricingService.setPricing(getAuthUser(req), schoolId, parsed.value));
    } catch (err) {
      sendCaughtError(res, err);
    }
  };

  getPricingBySchool = async (req: Request, res: Response): Promise<void> => {
    try {
      const schoolId = uuidParam(req.params.schoolId, 'École');
      res.json(await this.pricingService.getPricingBySchool(schoolId));
    } catch (err) {
      sendCaughtError(res, err);
    }
  };

  deletePricing = async (req: Request, res: Response): Promise<void> => {
    try {
      const id = uuidParam(req.params.id, 'Tarif');
      await this.pricingService.deletePricing(getAuthUser(req), id);
      res.status(204).send();
    } catch (err) {
      sendCaughtError(res, err);
    }
  };

  // --- Pièces du dossier administratif (F1–F4, D-61) ---

  /** F1 : tout instructeur de l'école lit la liste qu'il devra cocher. */
  listDocumentTypes = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const schoolId = uuidParam(req.params.schoolId, 'École');
      res.json(await this.documentTypeService.listBySchool(getAuthUser(req), schoolId));
    } catch (err) {
      sendCaughtError(res, err);
    }
  };

  /** F2 (gérant) */
  addDocumentType = async (req: AuthRequest, res: Response): Promise<void> => {
    const parsed = validate(documentTypeSchema, req.body);
    if (!parsed.ok) {
      sendValidationError(res, parsed.detail);
      return;
    }
    try {
      const schoolId = uuidParam(req.params.schoolId, 'École');
      res
        .status(201)
        .json(await this.documentTypeService.add(getAuthUser(req), schoolId, parsed.value.label));
    } catch (err) {
      sendCaughtError(res, err);
    }
  };

  /** F3 (gérant) */
  renameDocumentType = async (req: AuthRequest, res: Response): Promise<void> => {
    const parsed = validate(documentTypeSchema, req.body);
    if (!parsed.ok) {
      sendValidationError(res, parsed.detail);
      return;
    }
    try {
      const id = uuidParam(req.params.id, 'Pièce');
      res.json(await this.documentTypeService.rename(getAuthUser(req), id, parsed.value.label));
    } catch (err) {
      sendCaughtError(res, err);
    }
  };

  /** F4 (gérant) : désactivation, pas de suppression. */
  removeDocumentType = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const id = uuidParam(req.params.id, 'Pièce');
      await this.documentTypeService.remove(getAuthUser(req), id);
      res.status(204).send();
    } catch (err) {
      sendCaughtError(res, err);
    }
  };
}
