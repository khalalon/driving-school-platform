import { Pool } from 'pg';
import { Queryable } from '../../../db/transaction';
import { DEFAULT_DOCUMENT_TYPES, DocumentType } from '../types/school.types';

export interface IDocumentTypeRepository {
  /** Liste par défaut (D-61) à la création d'une école ; ne touche pas à une liste déjà posée. */
  insertDefaults(schoolId: string, executor?: Queryable): Promise<DocumentType[]>;
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
}
