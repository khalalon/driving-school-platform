import { fakePool, UUID } from '../../../../test-utils/http';
import { StudentFileRepository } from '../student-file.repository';

/**
 * Le dossier d'un élève est une **jointure gauche** : la liste des pièces de l'école reste
 * entière, les pièces reçues s'y accrochent. `studentId` = `students.id` (D-28, piège connu).
 */
describe('StudentFileRepository (16.2, D-61)', () => {
  it('findStudentId : la fiche du couple élève × école, null sans fiche', async () => {
    const { pool, query } = fakePool([{ id: 'student-1' }]);

    await expect(
      new StudentFileRepository(pool).findStudentId(UUID.student, UUID.school)
    ).resolves.toBe('student-1');
    const [sql, params] = query.mock.calls[0] as [string, unknown[]];
    expect(sql).toMatch(/FROM students WHERE user_id = \$1 AND school_id = \$2/);
    expect(params).toEqual([UUID.student, UUID.school]);

    await expect(
      new StudentFileRepository(fakePool([]).pool).findStudentId(UUID.student, UUID.school)
    ).resolves.toBeNull();
  });

  it('listDocuments : jointure gauche sur les pièces actives de l’école, ordre d’affichage', async () => {
    const { pool, query } = fakePool([
      { documentTypeId: 'doc-1', label: 'Copie de la CIN', received: true },
    ]);

    await new StudentFileRepository(pool).listDocuments('student-1', UUID.school);

    const [sql, params] = query.mock.calls[0] as [string, unknown[]];
    expect(sql).toMatch(/LEFT JOIN student_documents/);
    expect(sql).toMatch(/sd\.id IS NOT NULL AS received/);
    expect(sql).toMatch(/WHERE dt\.school_id = \$2 AND dt\.active/);
    expect(sql).toMatch(/ORDER BY dt\.position, dt\.label/);
    expect(params).toEqual(['student-1', UUID.school]);
  });

  it('documentTypeExists : la pièce doit être active et appartenir à l’école', async () => {
    const { pool, query } = fakePool([{ '?column?': 1 }]);
    const repo = new StudentFileRepository(pool);

    await expect(repo.documentTypeExists('doc-1', UUID.school)).resolves.toBe(true);
    expect((query.mock.calls[0] as [string, unknown[]])[0]).toMatch(
      /WHERE id = \$1 AND school_id = \$2 AND active/
    );

    await expect(
      new StudentFileRepository(fakePool([]).pool).documentTypeExists('doc-1', UUID.school)
    ).resolves.toBe(false);
  });

  it('markReceived : cocher deux fois ne refait pas la date de réception ; markNotReceived efface', async () => {
    const { pool, query } = fakePool([]);
    const repo = new StudentFileRepository(pool);

    await repo.markReceived('student-1', 'doc-1', UUID.instructor, 'Reçue au bureau');
    const [insert, params] = query.mock.calls[0] as [string, unknown[]];
    expect(insert).toMatch(/ON CONFLICT \(student_id, document_type_id\)/);
    expect(insert).toMatch(
      /DO UPDATE SET received_by = EXCLUDED\.received_by, note = EXCLUDED\.note/
    );
    expect(insert).not.toMatch(/received_at = /);
    expect(params).toEqual(['student-1', 'doc-1', UUID.instructor, 'Reçue au bureau']);

    await repo.markNotReceived('student-1', 'doc-1');
    expect((query.mock.calls[1] as [string, unknown[]])[0]).toMatch(
      /DELETE FROM student_documents/
    );
  });

  it('missingDocumentsByUser : une requête pour toute une liste, groupée par compte (16.3)', async () => {
    const { pool, query } = fakePool([
      { userId: 'user-1', label: 'Certificat médical' },
      { userId: 'user-1', label: 'Timbre fiscal' },
      { userId: 'user-2', label: 'Copie de la CIN' },
    ]);

    const missing = await new StudentFileRepository(pool).missingDocumentsByUser([
      'user-1',
      'user-2',
      'user-1',
    ]);

    expect(missing.get('user-1')).toEqual(['Certificat médical', 'Timbre fiscal']);
    expect(missing.get('user-2')).toEqual(['Copie de la CIN']);
    expect(missing.has('user-3')).toBe(false);

    const [sql, params] = query.mock.calls[0] as [string, unknown[]];
    expect(sql).toMatch(/WHERE s\.user_id = ANY\(\$1::uuid\[\]\) AND sd\.id IS NULL/);
    // Les doublons sont écartés avant la requête
    expect(params).toEqual([['user-1', 'user-2']]);
  });

  it('missingDocumentsByUser : aucune requête pour une liste vide', async () => {
    const { pool, query } = fakePool([]);

    await expect(new StudentFileRepository(pool).missingDocumentsByUser([])).resolves.toEqual(
      new Map()
    );
    expect(query).not.toHaveBeenCalled();
  });
});
