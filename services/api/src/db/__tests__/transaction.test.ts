import { Pool, PoolClient } from 'pg';
import { PgTransactionRunner } from '../transaction';

describe('PgTransactionRunner', () => {
  const setup = (): { runner: PgTransactionRunner; query: jest.Mock; release: jest.Mock } => {
    const query = jest.fn().mockResolvedValue({ rows: [] });
    const release = jest.fn();
    const client = { query, release } as unknown as PoolClient;
    const pool = { connect: jest.fn().mockResolvedValue(client) } as unknown as Pool;
    return { runner: new PgTransactionRunner(pool), query, release };
  };
  const statements = (query: jest.Mock): string[] =>
    query.mock.calls.map((call) => String((call as [string])[0]));

  it('BEGIN, travail sur le client, COMMIT, puis libération du client', async () => {
    const { runner, query, release } = setup();

    const result = await runner.run(async (tx) => {
      await tx.query('SELECT 1');
      return 42;
    });

    expect(result).toBe(42);
    expect(statements(query)).toEqual(['BEGIN', 'SELECT 1', 'COMMIT']);
    expect(release).toHaveBeenCalledTimes(1);
  });

  it('le travail rejette → ROLLBACK, client libéré, erreur d’origine relancée', async () => {
    const { runner, query, release } = setup();
    const failure = new Error('boom');

    await expect(runner.run(() => Promise.reject(failure))).rejects.toBe(failure);

    expect(statements(query)).toEqual(['BEGIN', 'ROLLBACK']);
    expect(release).toHaveBeenCalledTimes(1);
  });

  it('un ROLLBACK qui échoue ne masque pas l’erreur d’origine', async () => {
    const { runner, query, release } = setup();
    const failure = new Error('boom');
    query.mockImplementation((text: string) =>
      text === 'ROLLBACK'
        ? Promise.reject(new Error('connexion perdue'))
        : Promise.resolve({ rows: [] })
    );

    await expect(runner.run(() => Promise.reject(failure))).rejects.toBe(failure);
    expect(release).toHaveBeenCalledTimes(1);
  });
});
