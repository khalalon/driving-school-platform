import { Pool, QueryResult, QueryResultRow } from 'pg';

/** Ce qu'un repository a besoin d'exécuter : un `Pool` hors transaction, un client dedans. */
export interface Queryable {
  query<R extends QueryResultRow = QueryResultRow>(
    text: string,
    values?: unknown[]
  ): Promise<QueryResult<R>>;
}

export interface ITransactionRunner {
  /** Exécute `work` dans une transaction : COMMIT si elle résout, ROLLBACK et rejet sinon. */
  run<T>(work: (tx: Queryable) => Promise<T>): Promise<T>;
}

export class PgTransactionRunner implements ITransactionRunner {
  constructor(private readonly pool: Pool) {}

  async run<T>(work: (tx: Queryable) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await work(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      // L'erreur d'origine prime sur un éventuel échec du ROLLBACK (connexion perdue).
      await client.query('ROLLBACK').catch(() => undefined);
      throw error;
    } finally {
      client.release();
    }
  }
}
