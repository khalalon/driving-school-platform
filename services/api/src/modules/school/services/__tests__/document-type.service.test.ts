import { SchoolGuard } from '../../../../http/authz';
import { AuthUser, UserRole } from '../../../../types/auth';
import { IDocumentTypeRepository } from '../../repositories/document-type.repository';
import { ISchoolRepository } from '../../repositories/school.repository';
import { DocumentType } from '../../types/school.types';
import { DocumentTypeService } from '../document-type.service';

/**
 * F1–F4 (D-61) : tout instructeur de l'école lit la liste des pièces, seul son gérant la tient
 * (D-56 (b)). Les refus attendus : 403 `FORBIDDEN_MANAGER` au moniteur, 403 `FORBIDDEN_SCHOOL`
 * à une autre école, 404 sur une école ou une pièce inconnue.
 */
describe('DocumentTypeService (16.2)', () => {
  const piece: DocumentType = {
    id: 'doc-1',
    schoolId: 'school-1',
    label: 'Copie de la CIN',
    position: 1,
    active: true,
  };
  const monitor: AuthUser = { userId: 'user-mon', email: 'm@x.io', role: UserRole.INSTRUCTOR };
  const manager: AuthUser = { userId: 'user-mgr', email: 'g@x.io', role: UserRole.INSTRUCTOR };
  const admin: AuthUser = { userId: 'user-adm', email: 'a@x.io', role: UserRole.ADMIN };

  let documentTypes: jest.Mocked<IDocumentTypeRepository>;
  let schools: jest.Mocked<ISchoolRepository>;
  const instructorLookup = { findByUserId: jest.fn() };
  let service: DocumentTypeService;

  beforeEach(() => {
    documentTypes = {
      insertDefaults: jest.fn(),
      findBySchoolId: jest.fn().mockResolvedValue([piece]),
      findById: jest.fn().mockResolvedValue(piece),
      insert: jest.fn().mockResolvedValue(piece),
      rename: jest.fn().mockResolvedValue(piece),
      deactivate: jest.fn(),
    };
    schools = {
      create: jest.fn(),
      findById: jest.fn().mockResolvedValue({ id: 'school-1' }),
      findAll: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    } as unknown as jest.Mocked<ISchoolRepository>;
    instructorLookup.findByUserId.mockReset();
    instructorLookup.findByUserId.mockImplementation((userId: string) =>
      Promise.resolve(
        userId === manager.userId
          ? { id: 'instr-mgr', schoolId: 'school-1', isManager: true }
          : { id: 'instr-mon', schoolId: 'school-1', isManager: false }
      )
    );
    service = new DocumentTypeService(documentTypes, schools, new SchoolGuard(instructorLookup));
  });

  it('F1 : un simple moniteur de l’école lit la liste ; une école inconnue → 404', async () => {
    await expect(service.listBySchool(monitor, 'school-1')).resolves.toEqual([piece]);
    expect(documentTypes.findBySchoolId).toHaveBeenCalledWith('school-1');

    schools.findById.mockResolvedValue(null);
    await expect(service.listBySchool(monitor, 'school-1')).rejects.toMatchObject({
      status: 404,
      code: 'NOT_FOUND',
    });
  });

  it('F1 : une autre école est refusée (403 FORBIDDEN_SCHOOL)', async () => {
    await expect(service.listBySchool(monitor, 'school-2')).rejects.toMatchObject({
      status: 403,
      code: 'FORBIDDEN_SCHOOL',
    });
    expect(documentTypes.findBySchoolId).not.toHaveBeenCalled();
  });

  it('F2 : le gérant ajoute une pièce, le moniteur reçoit 403 FORBIDDEN_MANAGER (D-56)', async () => {
    await expect(service.add(manager, 'school-1', 'Timbre fiscal')).resolves.toEqual(piece);
    expect(documentTypes.insert).toHaveBeenCalledWith('school-1', 'Timbre fiscal');

    await expect(service.add(monitor, 'school-1', 'Timbre fiscal')).rejects.toMatchObject({
      status: 403,
      code: 'FORBIDDEN_MANAGER',
    });
    expect(documentTypes.insert).toHaveBeenCalledTimes(1);
  });

  it('F3 / F4 : le gérant renomme et retire (désactivation) ; l’admin passe', async () => {
    await expect(service.rename(manager, 'doc-1', 'CIN (recto-verso)')).resolves.toEqual(piece);
    expect(documentTypes.rename).toHaveBeenCalledWith('doc-1', 'CIN (recto-verso)');

    await service.remove(admin, 'doc-1');
    expect(documentTypes.deactivate).toHaveBeenCalledWith('doc-1');
  });

  it('F3 / F4 : la pièce porte son école — pièce inconnue → 404, autre école → 403', async () => {
    documentTypes.findById.mockResolvedValue(null);
    await expect(service.rename(manager, 'doc-x', 'Peu importe')).rejects.toMatchObject({
      status: 404,
      code: 'NOT_FOUND',
    });

    documentTypes.findById.mockResolvedValue({ ...piece, schoolId: 'school-2' });
    await expect(service.remove(manager, 'doc-1')).rejects.toMatchObject({
      status: 403,
      code: 'FORBIDDEN_SCHOOL',
    });
    expect(documentTypes.deactivate).not.toHaveBeenCalled();
  });
});
