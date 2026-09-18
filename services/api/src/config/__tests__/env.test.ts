import { loadEnv } from '../env';

const valid = {
  DATABASE_URL: 'postgresql://admin:password@localhost:5432/driving_school',
  REDIS_URL: 'redis://localhost:6379',
  JWT_SECRET: 'un-secret-de-test-suffisamment-long',
};

describe('loadEnv', () => {
  it('applique les défauts (port 3000, 15m / 7d, 12 tours) et convertit les nombres', () => {
    const env = loadEnv({ ...valid, PORT: '4000' });

    expect(env.PORT).toBe(4000);
    expect(env.NODE_ENV).toBe('development');
    expect(env.JWT_EXPIRES_IN).toBe('15m');
    expect(env.JWT_REFRESH_EXPIRES_IN).toBe('7d');
    expect(env.BCRYPT_ROUNDS).toBe(12);
  });

  it('refuse de démarrer sans JWT_SECRET ni DATABASE_URL, en listant les manques', () => {
    expect(() => loadEnv({ REDIS_URL: valid.REDIS_URL })).toThrow(/JWT_SECRET/);
    expect(() => loadEnv({ REDIS_URL: valid.REDIS_URL })).toThrow(/DATABASE_URL/);
  });

  it('refuse un secret trop court et une URL de base non Postgres', () => {
    expect(() => loadEnv({ ...valid, JWT_SECRET: 'court' })).toThrow(/JWT_SECRET/);
    expect(() => loadEnv({ ...valid, DATABASE_URL: 'mysql://x' })).toThrow(/DATABASE_URL/);
  });
});
