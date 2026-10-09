import { Pool } from 'pg';
import { Queryable } from '../../../db/transaction';
import { DEFAULT_DOCUMENT_TYPES, DocumentType } from '../types/school.types';

export interface IDocumentTypeRepository {
  /** Liste par défaut (D-61) à la création d'une école ; ne touche pas à une liste déjà posée. */
  insertDefaults(schoolId: string, executor?: Queryable): Promise<DocumentType[]>;
  /** F1 : les pièces **demandées** par l'école, dans l'ordre d'affichage (désactivées exclues). */
  findBySchoolId(schoolId: string): Promise<DocumentType[]>;
  findById(id: string): Promise<DocumentType | null>;
  /** F2 : ajout en fin de liste ; une pièce désactivée portant ce libellé est réactivée. */
  insert(schoolId: string, label: string): Promise<DocumentType>;
  rename(id: string, label: string): Promise<DocumentType>;
  /** F4 : désactivation — les dossiers déjà cochés gardent leur sens (D-61). */
  deactivate(id: string): Promise<void>;
}

const DOCUMENT_TYPE_COLUMNS = `id, school_id AS "schoolId", label, position, active`;

export class DocumentTypeRepository implements IDocumentTypeRepository {
  constructor(private readonly db: Pool) {}

  /**
   * Un seul INSERT : les libellés sont dépliés par `UNNEST … WITH ORDINALITY`, qui donne aussi
   * leur position. `ON CONFLICT DO NOTHING` rend l'appel rejouable — une école qui a déjà sa
   * liste n'en reçoit pas un doublon, et la méthode renvoie les pièces réellement insérées.
   */
  async insertDefaults(schoolId: string, executor: Queryable = this.db): Promise<DocumentType[]> {
    const result = await executor.query<DocumentType>(
      `INSERT INTO document_types (school_id, label, position)
       SELECT $1, d.label, d.position
       FROM UNNEST($2::text[]) WITH ORDINALITY AS d(label, position)
       ON CONFLICT (school_id, label) DO NOTHING
       RETURNING ${DOCUMENT_TYPE_COLUMNS}`,
      [schoolId, DEFAULT_DOCUMENT_TYPES]
    );
    return result.rows;
  }

  async findBySchoolId(schoolId: string): Promise<DocumentType[]> {
    const result = await this.db.query<DocumentType>(
      `SELECT ${DOCUMENT_TYPE_COLUMNS} FROM document_types
       WHERE school_id = $1 AND active
       ORDER BY position, label`,
      [schoolId]
    );
    return result.rows;
  }

  async findById(id: string): Promise<DocumentType | null> {
    const result = await this.db.query<DocumentType>(
      `SELECT ${DOCUMENT_TYPE_COLUMNS} FROM document_types WHERE id = $1`,
      [id]
    );
    return result.rows[0] ?? null;
  }

  /**
   * La position suit la dernière pièce de l'école (désactivées comprises : deux pièces ne se
   * disputent pas une place). Réactiver une pièce désactivée du même libellé, plutôt que
   * refuser le doublon, est le seul moyen de la remettre dans la liste : l'unicité
   * (school_id, label) la rend intouchable autrement.
   */
  async insert(schoolId: string, label: string): Promise<DocumentType> {
    const result = await this.db.query<DocumentType>(
      `INSERT INTO document_types (school_id, label, position)
       VALUES ($1, $2, COALESCE((SELECT MAX(position) FROM document_types WHERE school_id = $1), 0) + 1)
       ON CONFLICT (school_id, label) DO UPDATE SET active = TRUE
       RETURNING ${DOCUMENT_TYPE_COLUMNS}`,
      [schoolId, label]
    );
    return result.rows[0];
  }

  async rename(id: string, label: string): Promise<DocumentType> {
    const result = await this.db.query<DocumentType>(
      `UPDATE document_types SET label = $2 WHERE id = $1
       RETURNING ${DOCUMENT_TYPE_COLUMNS}`,
      [id, label]
    );
    return result.rows[0];
  }

  async deactivate(id: string): Promise<void> {
    await this.db.query(`UPDATE document_types SET active = FALSE WHERE id = $1`, [id]);
  }
}
