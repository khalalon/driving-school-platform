import { RedisClientType } from 'redis';

export interface ICacheService {
  set(key: string, value: string, expirySeconds?: number): Promise<void>;
  get(key: string): Promise<string | null>;
  delete(key: string): Promise<void>;
}

export class CacheService implements ICacheService {
  constructor(private readonly redis: RedisClientType) {}

  async set(key: string, value: string, expirySeconds?: number): Promise<void> {
    if (expirySeconds) {
      await this.redis.setEx(key, expirySeconds, value);
    } else {
      await this.redis.set(key, value);
    }
  }

  async get(key: string): Promise<string | null> {
    return this.redis.get(key);
  }

  async delete(key: string): Promise<void> {
    await this.redis.del(key);
  }
}
