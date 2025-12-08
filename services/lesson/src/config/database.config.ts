import { Pool } from 'pg';

export class DatabaseConfig {
  private static instance: Pool;

  private constructor() {}

  public static getInstance(): Pool {
    if (!DatabaseConfig.instance) {
      DatabaseConfig.instance = new Pool({
        connectionString: process.env.DATABASE_URL,
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
      });
    }
    return DatabaseConfig.instance;
  }
}
