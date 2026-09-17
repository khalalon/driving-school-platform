import { createClient, RedisClientType } from 'redis';

export class RedisConfig {
  private static instance: RedisClientType;

  private constructor() {}

  public static async getInstance(): Promise<RedisClientType> {
    if (!RedisConfig.instance) {
      RedisConfig.instance = createClient({
        url: process.env.REDIS_URL,
      }) as RedisClientType;

      RedisConfig.instance.on('error', (err) => {
        console.error('Redis Client Error', err);
      });

      await RedisConfig.instance.connect();
    }
    return RedisConfig.instance;
  }
}
