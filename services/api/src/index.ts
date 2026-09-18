import dotenv from 'dotenv';
import { createApp } from './app';
import { createPool } from './config/database';
import { loadEnv } from './config/env';
import { createRedisClient } from './config/redis';
import { buildAuthModule } from './modules/auth';

dotenv.config();

async function bootstrap(): Promise<void> {
  const env = loadEnv();
  const db = createPool(env.DATABASE_URL);
  const redis = await createRedisClient(env.REDIS_URL);

  const auth = buildAuthModule({ db, redis, env });
  const app = createApp({ auth: auth.router });

  app.listen(env.PORT, () => {
    console.info(`API démarrée sur le port ${env.PORT} (${env.NODE_ENV})`);
  });
}

bootstrap().catch((error: unknown) => {
  console.error('Démarrage impossible :', error instanceof Error ? error.message : error);
  process.exit(1);
});
