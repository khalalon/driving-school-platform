/**
 * globalSetup Jest : attend la passerelle, puis applique fixtures/seed.sql (idempotent).
 *
 * Variables :
 *  - GATEWAY_URL   : passerelle Nginx (défaut http://localhost)
 *  - DATABASE_URL  : Postgres ; sinon construite depuis POSTGRES_USER / POSTGRES_PASSWORD /
 *                    POSTGRES_DB / POSTGRES_PORT, lus dans l'environnement puis dans le `.env`
 *                    racine (mêmes clés et mêmes défauts que docker-compose.yml).
 */
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { Client } from 'pg';

const GATEWAY_URL = process.env.GATEWAY_URL ?? 'http://localhost';

function readRootEnv(): Record<string, string> {
  const file = join(__dirname, '..', '.env');
  if (!existsSync(file)) return {};
  const values: Record<string, string> = {};
  for (const raw of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    values[line.slice(0, eq).trim()] = line.slice(eq + 1).trim();
  }
  return values;
}

function databaseUrl(): string {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const rootEnv = readRootEnv();
  const pick = (key: string, fallback: string): string =>
    process.env[key] ?? rootEnv[key] ?? fallback;
  const user = pick('POSTGRES_USER', 'admin');
  const password = pick('POSTGRES_PASSWORD', 'password');
  const db = pick('POSTGRES_DB', 'driving_school');
  const port = pick('POSTGRES_PORT', '5432');
  return `postgresql://${user}:${password}@localhost:${port}/${db}`;
}

async function waitForGateway(): Promise<void> {
  const deadline = Date.now() + 90_000;
  let lastError = 'aucune réponse';
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${GATEWAY_URL}/health`);
      if (res.ok) return;
      lastError = `HTTP ${res.status}`;
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
    }
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
  throw new Error(`Passerelle injoignable sur ${GATEWAY_URL}/health après 90 s (${lastError})`);
}

async function applySeed(): Promise<void> {
  const client = new Client({ connectionString: databaseUrl() });
  await client.connect();
  try {
    await client.query(readFileSync(join(__dirname, 'fixtures', 'seed.sql'), 'utf8'));
  } finally {
    await client.end();
  }
}

export default async function globalSetup(): Promise<void> {
  await waitForGateway();
  await applySeed();
}
