import { Pool } from 'pg';
import { StudentFileDocument } from '../types/student.types';

/**
 * Dossier administratif d'un élève (F5–F7, D-61). Le dossier est la **liste des pièces de son
 * école** (`document_types`, tenue par le module school) jointe aux pièces **reçues**
 * (`student_documents`) : la jointure est la raison d'être de ce dépôt, qui lit donc les deux
 * tables. `studentId` ici est `students.id` — la ligne élève × école —, jamais `users.id`.
 */
export interface IStudentFileRepository {
  /** `students.id` de l'élève dans cette école, ou `null` s'il n'y a pas de fiche. */
  findStudentId(userId: string, schoolId: string): Promise<string | null>;
  /** Une ligne par pièce demandée, reçue ou non, dans l'ordre d'affichage de l'école. */
  listDocuments(studentId: string, schoolId: string): Promise<StudentFileDocument[]>;
  /** La pièce existe-t-elle, active, dans cette école ? */
  documentTypeExists(documentTypeId: string, schoolId: string): Promise<boolean>;
  markReceived(
    studentId: string,
    documentTypeId: string,
    receivedBy: string,
    note: string | null
  ): Promise<void>;
  markNotReceived(studentId: string, documentTypeId: string): Promise<void>;
  /**
   * Pièces encore attendues, pour plusieurs comptes d'un coup (16.3) : `users.id` → libellés,
   * dans l'ordre d'affichage de leur école. Une seule requête, quel que soit le nombre
   * d'examens listés par X1. Un compte sans fiche élève, ou dont l'école ne demande rien,
   * n'apparaît pas dans la carte : son dossier est complet, il n'y a rien à apporter.
   */
  missingDocumentsByUser(userIds: string[]): Promise<Map<string, string[]>>;
}

export class StudentFileRepository implements IStudentFileRepository {
  constructor(private readonly db: Pool) {}

  async findStudentId(userId: string, schoolId: string): Promise<string | null> {
    const result = await this.db.query<{ id: string }>(
      `SELECT id FROM students WHERE user_id = $1 AND school_id = $2`,
      [userId, schoolId]
    );
    return result.rows[0]?.id ?? null;
  }

  async listDocuments(studentId: string, schoolId: string): Promise<StudentFileDocument[]> {
    const result = await this.db.query<StudentFileDocument>(
      `SELECT dt.id AS "documentTypeId",
              dt.label,
              sd.id IS NOT NULL AS received,
              sd.received_at AS "receivedAt",
              sd.note
       FROM document_types dt
       LEFT JOIN student_documents sd
              ON sd.document_type_id = dt.id AND sd.student_id = $1
       WHERE dt.school_id = $2 AND dt.active
       ORDER BY dt.position, dt.label`,
      [studentId, schoolId]
    );
    return result.rows;
  }

  async documentTypeExists(documentTypeId: string, schoolId: string): Promise<boolean> {
    const result = await this.db.query(
      `SELECT 1 FROM document_types WHERE id = $1 AND school_id = $2 AND active`,
      [documentTypeId, schoolId]
    );
    return result.rows.length > 0;
  }

  /**
   * Cocher une pièce déjà reçue n'en fait pas une nouvelle réception : la date de la première
   * remise est conservée, seuls la note et l'auteur sont rafraîchis.
   */
  async markReceived(
    studentId: string,
    documentTypeId: string,
    receivedBy: string,
    note: string | null
  ): Promise<void> {
    await this.db.query(
      `INSERT INTO student_documents (student_id, document_type_id, received_by, note)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (student_id, document_type_id)
       DO UPDATE SET received_by = EXCLUDED.received_by, note = EXCLUDED.note`,
      [studentId, documentTypeId, receivedBy, note]
    );
  }

  async markNotReceived(studentId: string, documentTypeId: string): Promise<void> {
    await this.db.query(
      `DELETE FROM student_documents WHERE student_id = $1 AND document_type_id = $2`,
      [studentId, documentTypeId]
    );
  }

  /**
   * L'école vient de la fiche élève (une seule par compte, D-22) : `users.id` suffit en entrée.
   * Les pièces reçues sont écartées par `sd.id IS NULL` après la jointure gauche.
   */
  async missingDocumentsByUser(userIds: string[]): Promise<Map<string, string[]>> {
    const missing = new Map<string, string[]>();
    if (userIds.length === 0) {
      return missing;
    }

    const result = await this.db.query<{ userId: string; label: string }>(
      `SELECT s.user_id AS "userId", dt.label
       FROM students s
       JOIN document_types dt ON dt.school_id = s.school_id AND dt.active
       LEFT JOIN student_documents sd
              ON sd.document_type_id = dt.id AND sd.student_id = s.id
       WHERE s.user_id = ANY($1::uuid[]) AND sd.id IS NULL
       ORDER BY dt.position, dt.label`,
      [[...new Set(userIds)]]
    );

    for (const row of result.rows) {
      const labels = missing.get(row.userId);
      if (labels) {
        labels.push(row.label);
      } else {
        missing.set(row.userId, [row.label]);
      }
    }
    return missing;
  }
}
