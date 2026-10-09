/**
 * F1–F7 (16.4) : chemins, verbes, payloads et `response.data`. `note` n'est envoyée que
 * renseignée — sans quoi décocher une pièce effacerait la note de la précédente réception.
 */
import { mockApiClientModule, mockedApiClient, respond } from './mockApiClient';

jest.mock('../ApiClient', () => mockApiClientModule());

import { studentFileService } from '../StudentFileService';
import { DocumentType, StudentFile } from '../../../models/StudentFile';

const piece: DocumentType = {
  id: 'doc-1',
  schoolId: 'school-1',
  label: 'Copie de la CIN',
  position: 1,
  active: true,
};
const file: StudentFile = {
  complete: false,
  documents: [
    {
      documentTypeId: 'doc-1',
      label: 'Copie de la CIN',
      received: false,
      receivedAt: null,
      note: null,
    },
  ],
};

describe('studentFileService', () => {
  const api = mockedApiClient();

  beforeEach(() => jest.clearAllMocks());

  it('F1 / F2 : liste et ajout sur le chemin de l’école', async () => {
    api.get.mockResolvedValue(respond([piece]));
    api.post.mockResolvedValue(respond(piece, 201));

    await expect(studentFileService.getDocumentTypes('school-1')).resolves.toEqual([piece]);
    expect(api.get).toHaveBeenCalledWith('/api/schools/school-1/document-types');

    await expect(studentFileService.addDocumentType('school-1', 'Timbre fiscal')).resolves.toEqual(
      piece
    );
    expect(api.post).toHaveBeenCalledWith('/api/schools/school-1/document-types', {
      label: 'Timbre fiscal',
    });
  });

  it('F3 / F4 : la pièce est désignée par son identifiant, pas par son école', async () => {
    api.put.mockResolvedValue(respond(piece));
    api.delete.mockResolvedValue(respond(undefined, 204));

    await studentFileService.renameDocumentType('doc-1', 'CIN (recto-verso)');
    expect(api.put).toHaveBeenCalledWith('/api/schools/document-types/doc-1', {
      label: 'CIN (recto-verso)',
    });

    await studentFileService.removeDocumentType('doc-1');
    expect(api.delete).toHaveBeenCalledWith('/api/schools/document-types/doc-1');
  });

  it('F5 / F6 : dossier vu par l’école et par l’élève', async () => {
    api.get.mockResolvedValue(respond(file));

    await expect(studentFileService.getStudentFile('u1', 'school-1')).resolves.toEqual(file);
    expect(api.get).toHaveBeenCalledWith('/api/profiles/u1/schools/school-1/file');

    await expect(studentFileService.getMyFile('school-1')).resolves.toEqual(file);
    expect(api.get).toHaveBeenCalledWith('/api/student-profiles/me/schools/school-1/file');
  });

  it('F7 : pièce cochée avec note, puis décochée sans note', async () => {
    api.put.mockResolvedValue(respond({ ...file, complete: true }));

    await expect(
      studentFileService.setDocumentReceived('u1', 'school-1', 'doc-1', true, 'Reçue au bureau')
    ).resolves.toMatchObject({ complete: true });
    expect(api.put).toHaveBeenCalledWith('/api/profiles/u1/schools/school-1/documents/doc-1', {
      received: true,
      note: 'Reçue au bureau',
    });

    await studentFileService.setDocumentReceived('u1', 'school-1', 'doc-1', false);
    expect(api.put).toHaveBeenLastCalledWith('/api/profiles/u1/schools/school-1/documents/doc-1', {
      received: false,
    });
  });
});
