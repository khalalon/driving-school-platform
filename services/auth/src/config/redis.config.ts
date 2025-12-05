import { createClient } from 'redis';

export class RedisConfig {
  private static instance: ReturnType<typeof createClient>;

  private constructor() {}

  public static async getInstance(): Promise<ReturnType<typeof createClient>> {
    if (!RedisConfig.instance) {
      RedisConfig.instance = createClient({
        url: process.env.REDIS_URL,
      });

      RedisConfig.instance.on('error', (err) => {
        console.error('Redis Client Error', err);
      });

      await RedisConfig.instance.connect();
    }
    return RedisConfig.instance;
  }
}
