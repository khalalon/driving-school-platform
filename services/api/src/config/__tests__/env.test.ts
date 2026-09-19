import { loadEnv } from '../env';

const valid = {
  DATABASE_URL: 'postgresql://admin:password@localhost:5432/driving_school',
  REDIS_URL: 'redis://localhost:6379',
  JWT_ACCESS_SECRET: 'un-secret-access-de-test-suffisamment-long',
  JWT_REFRESH_SECRET: 'un-secret-refresh-de-test-suffisamment-long',
};

describe('loadEnv', () => {
  it('applique les défauts (port 3000, 1h / 30d — D-23, 12 tours) et convertit les nombres', () => {
    const env = loadEnv({ ...valid, PORT: '4000' });

    expect(env.PORT).toBe(4000);
    expect(env.NODE_ENV).toBe('development');
    expect(env.JWT_ACCESS_EXPIRES_IN).toBe('1h');
    expect(env.JWT_REFRESH_EXPIRES_IN).toBe('30d');
    expect(env.BCRYPT_ROUNDS).toBe(12);
    expect(env.LESSON_CANCEL_HOURS).toBe(24);
  });

  it('refuse de démarrer sans les deux secrets JWT ni DATABASE_URL, en listant les manques', () => {
    const attempt = (): unknown => loadEnv({ REDIS_URL: valid.REDIS_URL });
    expect(attempt).toThrow(/JWT_ACCESS_SECRET/);
    expect(attempt).toThrow(/JWT_REFRESH_SECRET/);
    expect(attempt).toThrow(/DATABASE_URL/);
  });

  it('refuse un secret trop court, deux secrets identiques (D-12) et une URL non Postgres', () => {
    expect(() => loadEnv({ ...valid, JWT_ACCESS_SECRET: 'court' })).toThrow(/JWT_ACCESS_SECRET/);
    expect(() => loadEnv({ ...valid, JWT_REFRESH_SECRET: valid.JWT_ACCESS_SECRET })).toThrow(
      /JWT_REFRESH_SECRET.*différer/
    );
    expect(() => loadEnv({ ...valid, DATABASE_URL: 'mysql://x' })).toThrow(/DATABASE_URL/);
  });
});
