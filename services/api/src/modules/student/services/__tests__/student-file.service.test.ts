import { SchoolGuard } from '../../../../http/authz';
import { AuthUser, UserRole } from '../../../../types/auth';
import { IStudentFileRepository } from '../../repositories/student-file.repository';
import { StudentFileDocument } from '../../types/student.types';
import { StudentFileService } from '../student-file.service';

/**
 * F5–F7 (D-61, D-62) : le dossier est la liste des pièces de l'école, cochée ou non. Il informe
 * et n'interdit rien ; `complete` se calcule sur les pièces encore demandées.
 */
describe('StudentFileService (16.2)', () => {
  const userId = 'user-eleve';
  const schoolId = 'school-1';
  const studentId = 'student-1';
  const instructor: AuthUser = { userId: 'user-instr', email: 'i@x.io', role: UserRole.INSTRUCTOR };

  const cin: StudentFileDocument = {
    documentTypeId: 'doc-1',
    label: 'Copie de la CIN',
    received: true,
    receivedAt: new Date('2026-10-09T09:00:00Z'),
    note: null,
  };
  const timbre: StudentFileDocument = {
    documentTypeId: 'doc-2',
    label: 'Timbre fiscal',
    received: false,
    receivedAt: null,
    note: null,
  };

  let files: jest.Mocked<IStudentFileRepository>;
  const instructorLookup = { findByUserId: jest.fn() };
  let service: StudentFileService;

  beforeEach(() => {
    files = {
      findStudentId: jest.fn().mockResolvedValue(studentId),
      listDocuments: jest.fn().mockResolvedValue([cin, timbre]),
      documentTypeExists: jest.fn().mockResolvedValue(true),
      markReceived: jest.fn(),
      markNotReceived: jest.fn(),
    };
    instructorLookup.findByUserId.mockReset();
    instructorLookup.findByUserId.mockResolvedValue({ id: 'instr-1', schoolId });
    service = new StudentFileService(files, new SchoolGuard(instructorLookup));
  });

  it('F5 : dossier incomplet tant qu’une pièce manque ; users.id résolu en students.id (D-28)', async () => {
    await expect(service.getStudentFile(instructor, userId, schoolId)).resolves.toEqual({
      complete: false,
      documents: [cin, timbre],
    });
    expect(files.findStudentId).toHaveBeenCalledWith(userId, schoolId);
    expect(files.listDocuments).toHaveBeenCalledWith(studentId, schoolId);
  });

  it('F5 : toutes les pièces reçues → complete ; une école sans pièce aussi (rien à apporter)', async () => {
    files.listDocuments.mockResolvedValue([cin]);
    await expect(service.getStudentFile(instructor, userId, schoolId)).resolves.toMatchObject({
      complete: true,
    });

    files.listDocuments.mockResolvedValue([]);
    await expect(service.getStudentFile(instructor, userId, schoolId)).resolves.toEqual({
      complete: true,
      documents: [],
    });
  });

  it('F5 : autre école → 403 FORBIDDEN_SCHOOL ; élève sans fiche → 404', async () => {
    await expect(service.getStudentFile(instructor, userId, 'school-2')).rejects.toMatchObject({
      status: 403,
      code: 'FORBIDDEN_SCHOOL',
    });

    files.findStudentId.mockResolvedValue(null);
    await expect(service.getStudentFile(instructor, userId, schoolId)).rejects.toMatchObject({
      status: 404,
      code: 'NOT_FOUND',
    });
  });

  it('F6 : l’élève lit son propre dossier sans passer par le cloisonnement', async () => {
    await expect(service.getOwnFile(userId, schoolId)).resolves.toMatchObject({ complete: false });
    expect(instructorLookup.findByUserId).not.toHaveBeenCalled();
  });

  it('F7 : pièce reçue avec note, puis décochée ; le dossier à jour est renvoyé', async () => {
    files.listDocuments.mockResolvedValue([cin]);

    await expect(
      service.setDocumentReceived(instructor, userId, schoolId, 'doc-1', true, 'Reçue au bureau')
    ).resolves.toMatchObject({ complete: true });
    expect(files.markReceived).toHaveBeenCalledWith(
      studentId,
      'doc-1',
      instructor.userId,
      'Reçue au bureau'
    );

    await service.setDocumentReceived(instructor, userId, schoolId, 'doc-1', false);
    expect(files.markNotReceived).toHaveBeenCalledWith(studentId, 'doc-1');
  });

  it('F7 : sans note, `null` est écrit ; une pièce étrangère à l’école → 404', async () => {
    await service.setDocumentReceived(instructor, userId, schoolId, 'doc-1', true);
    expect(files.markReceived).toHaveBeenCalledWith(studentId, 'doc-1', instructor.userId, null);

    files.documentTypeExists.mockResolvedValue(false);
    await expect(
      service.setDocumentReceived(instructor, userId, schoolId, 'doc-autre', true)
    ).rejects.toMatchObject({ status: 404, code: 'NOT_FOUND' });
    expect(files.markReceived).toHaveBeenCalledTimes(1);
  });
});
