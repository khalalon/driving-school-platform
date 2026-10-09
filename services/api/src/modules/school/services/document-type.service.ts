import { SchoolGuard } from '../../../http/authz';
import { HttpError } from '../../../http/errors';
import { AuthUser } from '../../../types/auth';
import { IDocumentTypeRepository } from '../repositories/document-type.repository';
import { ISchoolRepository } from '../repositories/school.repository';
import { DocumentType } from '../types/school.types';

/**
 * Pièces du dossier administratif demandées par une école (F1–F4, D-61). Lecture ouverte à tout
 * instructeur de l'école (il remplit les dossiers) ; la liste elle-même n'est tenue que par le
 * **gérant** (D-56 (b)) — 403 `FORBIDDEN_MANAGER` pour un simple moniteur, 403 `FORBIDDEN_SCHOOL`
 * pour une autre école. Une pièce retirée est désactivée, jamais supprimée.
 */
export class DocumentTypeService {
  constructor(
    private readonly documentTypes: IDocumentTypeRepository,
    private readonly schools: ISchoolRepository,
    private readonly schoolGuard: SchoolGuard
  ) {}

  /** F1 : la liste demandée par l'école, telle que l'instructeur la coche. */
  async listBySchool(caller: AuthUser, schoolId: string): Promise<DocumentType[]> {
    await this.schoolGuard.assertSameSchool(caller, schoolId);
    await this.requireSchool(schoolId);
    return this.documentTypes.findBySchoolId(schoolId);
  }

  /** F2 (gérant) : ajout en fin de liste ; un libellé déjà retiré revient actif. */
  async add(caller: AuthUser, schoolId: string, label: string): Promise<DocumentType> {
    await this.schoolGuard.assertManager(caller, schoolId);
    await this.requireSchool(schoolId);
    return this.documentTypes.insert(schoolId, label);
  }

  /** F3 (gérant) : renommage ; les pièces déjà reçues restent rattachées. */
  async rename(caller: AuthUser, id: string, label: string): Promise<DocumentType> {
    const documentType = await this.requireDocumentType(id);
    await this.schoolGuard.assertManager(caller, documentType.schoolId);
    return this.documentTypes.rename(id, label);
  }

  /** F4 (gérant) : la pièce n'est plus demandée ; les dossiers déjà cochés gardent leur sens. */
  async remove(caller: AuthUser, id: string): Promise<void> {
    const documentType = await this.requireDocumentType(id);
    await this.schoolGuard.assertManager(caller, documentType.schoolId);
    await this.documentTypes.deactivate(id);
  }

  private async requireSchool(schoolId: string): Promise<void> {
    const school = await this.schools.findById(schoolId);
    if (!school) {
      throw new HttpError(404, 'NOT_FOUND', 'École introuvable');
    }
  }

  private async requireDocumentType(id: string): Promise<DocumentType> {
    const documentType = await this.documentTypes.findById(id);
    if (!documentType) {
      throw new HttpError(404, 'NOT_FOUND', 'Pièce introuvable');
    }
    return documentType;
  }
}
