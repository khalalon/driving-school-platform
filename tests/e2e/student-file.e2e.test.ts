/**
 * Dossier administratif, de bout en bout (16.6 — D-61, D-62).
 *
 * 1. L'école de démo a la liste par défaut des pièces (F1) ; un simple moniteur la lit mais
 *    ne la touche pas (F2 → 403 FORBIDDEN_MANAGER, D-56 (b)), le gérant si (F2, F4).
 * 2. Un élève fraîchement approuvé a un dossier vide : X1 le dit incomplet, **sans rien
 *    bloquer** — sa demande d'examen passe quand même (D-62).
 * 3. L'instructeur coche toutes les pièces (F7) : le dossier devient `complete`, l'élève le
 *    lit (F6) et X1 renvoie `fileComplete: true`.
 */
import { api, bearer, expectStatus, futureDate, SEED, step, uniqueEmail } from '../helpers/api';
import { ensureInstructorToken } from '../helpers/flow';

interface Tokens {
  accessToken: string;
}

interface DocumentType {
  id: string;
  label: string;
  position: number;
  active: boolean;
}

interface StudentFile {
  complete: boolean;
  documents: { documentTypeId: string; label: string; received: boolean; note: string | null }[];
}

interface Exam {
  id: string;
  fileComplete: boolean;
  missingDocuments: string[];
}

/** Liste par défaut posée à la création de l'école (D-61). */
const DEFAULT_LABELS = [
  'Copie de la CIN',
  "Photos d'identité",
  'Certificat médical',
  'Extrait de naissance',
  'Timbre fiscal',
];

describe('dossier administratif (D-61, D-62)', () => {
  /** Moniteur de démo : instructeur de l'école, **pas** gérant. */
  let monitorToken = '';
  let managerToken = '';
  let studentToken = '';
  let studentId = '';
  let documents: DocumentType[] = [];
  /** Pièce ajoutée par la campagne, retirée à la fin pour laisser l'école comme on l'a trouvée. */
  let addedDocumentId = '';

  beforeAll(async () => {
    monitorToken = await ensureInstructorToken();
  });

  step('F1 — l’école de démo demande les cinq pièces par défaut', async () => {
    const res = await api()
      .get(`/api/schools/${SEED.schoolId}/document-types`)
      .set(bearer(monitorToken));
    expectStatus(res, 200, 'F1 liste des pièces');

    documents = res.body as DocumentType[];
    expect(documents.map((document) => document.label)).toEqual(
      expect.arrayContaining(DEFAULT_LABELS)
    );
    expect(documents.every((document) => document.active)).toBe(true);
    // L'ordre d'affichage est celui des positions
    const positions = documents.map((document) => document.position);
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);
  });

  step('F2 — un simple moniteur n’ajoute pas de pièce : 403 FORBIDDEN_MANAGER', async () => {
    const res = await api()
      .post(`/api/schools/${SEED.schoolId}/document-types`)
      .set(bearer(monitorToken))
      .send({ label: 'Pièce interdite au moniteur' });

    expectStatus(res, 403, 'F2 moniteur');
    expect((res.body as { error: string }).error).toBe('FORBIDDEN_MANAGER');
  });

  step('F2 — le gérant ajoute une pièce, en fin de liste', async () => {
    const registered = await api()
      .post('/api/auth/register')
      .send({
        email: uniqueEmail('e2e-file-manager'),
        password: 'Passw0rd!',
        firstName: 'Sami',
        lastName: 'Gérant',
        phone: '+216 98 000 222',
        licenseNumber: `LIC-FILE-${Date.now()}`,
        schoolCode: SEED.managerCode,
      });
    expectStatus(registered, 201, 'A2 gérant du dossier');
    managerToken = (registered.body as Tokens).accessToken;

    const label = `Attestation e2e ${Date.now()}`;
    const added = await api()
      .post(`/api/schools/${SEED.schoolId}/document-types`)
      .set(bearer(managerToken))
      .send({ label });
    expectStatus(added, 201, 'F2 gérant');

    const piece = added.body as DocumentType;
    addedDocumentId = piece.id;
    expect(piece.label).toBe(label);
    expect(piece.active).toBe(true);
    expect(piece.position).toBeGreaterThan(Math.max(...documents.map((d) => d.position)));
  });

  step('E2 + E5 — un élève est inscrit puis approuvé ; son dossier est vide', async () => {
    const registered = await api().post('/api/auth/register').send({
      email: uniqueEmail('e2e-file-student'),
      password: 'Passw0rd!',
      firstName: 'Nour',
      lastName: 'Dossier',
    });
    expectStatus(registered, 201, 'A2 élève du dossier');
    studentToken = (registered.body as Tokens).accessToken;

    const me = await api().get('/api/auth/me').set(bearer(studentToken));
    expectStatus(me, 200, 'A3 élève du dossier');
    studentId = (me.body as { id: string }).id;

    const requested = await api()
      .post(`/api/enrollment/schools/${SEED.schoolId}/request`)
      .set(bearer(studentToken))
      .send({ message: 'Dossier administratif, test de bout en bout' });
    expectStatus(requested, 201, 'E2 demande');

    const approved = await api()
      .put(`/api/enrollment/${(requested.body as { id: string }).id}/approve`)
      .set(bearer(monitorToken));
    expectStatus(approved, 200, 'E5 approbation');

    const file = await api()
      .get(`/api/profiles/${studentId}/schools/${SEED.schoolId}/file`)
      .set(bearer(monitorToken));
    expectStatus(file, 200, 'F5 dossier vide');

    const body = file.body as StudentFile;
    expect(body.complete).toBe(false);
    expect(body.documents.map((document) => document.label)).toEqual(
      expect.arrayContaining(DEFAULT_LABELS)
    );
    // La pièce ajoutée par le gérant fait partie du dossier dès l'approbation
    expect(body.documents.some((document) => document.documentTypeId === addedDocumentId)).toBe(
      true
    );
    expect(body.documents.every((document) => !document.received)).toBe(true);
  });

  step('X2 + X1 — un dossier incomplet ne bloque pas la demande d’examen (D-62)', async () => {
    const requested = await api()
      .post('/api/exams/request')
      .set(bearer(studentToken))
      .send({ examType: 'theory', preferredDate: futureDate(21), message: 'Dossier en cours' });
    // Rien ne bloque : la demande est acceptée malgré le dossier vide
    expectStatus(requested, 201, 'X2 avec dossier incomplet');

    const created = requested.body as Exam;
    expect(created.fileComplete).toBe(false);
    expect(created.missingDocuments).toEqual(expect.arrayContaining(DEFAULT_LABELS));

    const listed = await api().get('/api/exams/my-exams').set(bearer(studentToken));
    expectStatus(listed, 200, 'X1 élève');
    const exam = (listed.body as Exam[]).find((item) => item.id === created.id);
    expect(exam?.fileComplete).toBe(false);
  });

  step('F7 — l’instructeur coche toutes les pièces : le dossier devient complet', async () => {
    const file = await api()
      .get(`/api/profiles/${studentId}/schools/${SEED.schoolId}/file`)
      .set(bearer(monitorToken));
    expectStatus(file, 200, 'F5 avant pointage');

    let latest = file.body as StudentFile;
    for (const document of latest.documents) {
      const marked = await api()
        .put(
          `/api/profiles/${studentId}/schools/${SEED.schoolId}/documents/${document.documentTypeId}`
        )
        .set(bearer(monitorToken))
        .send({ received: true, note: 'Reçue au bureau' });
      expectStatus(marked, 200, `F7 ${document.label}`);
      latest = marked.body as StudentFile;
    }

    expect(latest.complete).toBe(true);
    expect(latest.documents.every((document) => document.received)).toBe(true);
    expect(latest.documents.every((document) => document.note === 'Reçue au bureau')).toBe(true);
  });

  step('F6 + X1 — l’élève lit son dossier complet, et son examen le dit aussi', async () => {
    const mine = await api()
      .get(`/api/student-profiles/me/schools/${SEED.schoolId}/file`)
      .set(bearer(studentToken));
    expectStatus(mine, 200, 'F6 dossier de l’élève');

    const body = mine.body as StudentFile;
    expect(body.complete).toBe(true);
    expect(body.documents.length).toBeGreaterThanOrEqual(DEFAULT_LABELS.length);

    const listed = await api().get('/api/exams/my-exams').set(bearer(studentToken));
    expectStatus(listed, 200, 'X1 après pointage');
    const exam = (listed.body as Exam[])[0];
    expect(exam.fileComplete).toBe(true);
    expect(exam.missingDocuments).toEqual([]);
  });

  step('F7 — décocher une pièce rend le dossier incomplet ; une pièce étrangère → 404', async () => {
    const file = await api()
      .get(`/api/profiles/${studentId}/schools/${SEED.schoolId}/file`)
      .set(bearer(monitorToken));
    expectStatus(file, 200, 'F5 avant décochage');

    const first = (file.body as StudentFile).documents[0];
    const unmarked = await api()
      .put(`/api/profiles/${studentId}/schools/${SEED.schoolId}/documents/${first.documentTypeId}`)
      .set(bearer(monitorToken))
      .send({ received: false });
    expectStatus(unmarked, 200, 'F7 décochage');
    expect((unmarked.body as StudentFile).complete).toBe(false);

    const unknown = '99999999-9999-4999-8999-999999999999';
    const foreign = await api()
      .put(`/api/profiles/${studentId}/schools/${SEED.schoolId}/documents/${unknown}`)
      .set(bearer(monitorToken))
      .send({ received: true });
    expectStatus(foreign, 404, 'F7 pièce étrangère');
  });

  step('F6 — un élève ne lit pas la liste des pièces de l’école (F1) : 403', async () => {
    const res = await api()
      .get(`/api/schools/${SEED.schoolId}/document-types`)
      .set(bearer(studentToken));
    expectStatus(res, 403, 'F1 élève');
  });

  step('F4 — le gérant retire la pièce ajoutée : elle quitte la liste et les dossiers', async () => {
    const removed = await api()
      .delete(`/api/schools/document-types/${addedDocumentId}`)
      .set(bearer(managerToken));
    expectStatus(removed, 204, 'F4 gérant');

    const listed = await api()
      .get(`/api/schools/${SEED.schoolId}/document-types`)
      .set(bearer(monitorToken));
    expectStatus(listed, 200, 'F1 après retrait');
    expect((listed.body as DocumentType[]).some((d) => d.id === addedDocumentId)).toBe(false);

    const file = await api()
      .get(`/api/profiles/${studentId}/schools/${SEED.schoolId}/file`)
      .set(bearer(monitorToken));
    expectStatus(file, 200, 'F5 après retrait');
    expect(
      (file.body as StudentFile).documents.some((d) => d.documentTypeId === addedDocumentId)
    ).toBe(false);
  });
});
