import { Pool, QueryResult } from 'pg';
import { authenticate } from '../middleware/auth.middleware';
import { TokenService } from '../modules/auth/services/token.service';
import { UserRole } from '../types/auth';

/** Outils partagés par les tests HTTP et repository ; exclus de la couverture. */

export const testTokenService = new TokenService({
  secret: 'test-secret-key-for-jwt-tokens-0123456789',
  accessTokenExpiry: '15m',
  refreshTokenExpiry: '7d',
});

export const testRequireAuth = authenticate(testTokenService);

export const TEST_USERS = {
  student: {
    userId: '11111111-1111-4111-8111-000000000001',
    email: 's@x.io',
    role: UserRole.STUDENT,
  },
  instructor: {
    userId: '11111111-1111-4111-8111-000000000002',
    email: 'i@x.io',
    role: UserRole.INSTRUCTOR,
  },
  admin: { userId: '11111111-1111-4111-8111-000000000003', email: 'a@x.io', role: UserRole.ADMIN },
} as const;

export function bearerFor(role: keyof typeof TEST_USERS): string {
  return `Bearer ${testTokenService.generateTokens(TEST_USERS[role]).accessToken}`;
}

export const UUID = {
  school: '22222222-2222-4222-8222-000000000001',
  request: '22222222-2222-4222-8222-000000000002',
  student: '22222222-2222-4222-8222-000000000003',
  booking: '22222222-2222-4222-8222-000000000004',
  instructor: '22222222-2222-4222-8222-000000000005',
} as const;

export interface FakePool {
  pool: Pool;
  query: jest.Mock;
}

/** `Pool` factice : `query` renvoie les lignes fournies ; on inspecte le SQL et ses paramètres. */
export function fakePool(rows: unknown[] = []): FakePool {
  const query = jest.fn().mockResolvedValue({ rows, rowCount: rows.length } as QueryResult);
  return { pool: { query } as unknown as Pool, query };
}
