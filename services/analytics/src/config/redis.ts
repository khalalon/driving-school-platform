import { createClient } from 'redis';

export interface ICache {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttl?: number): Promise<void>;
  del(key: string): Promise<void>;
}

export class RedisCache implements ICache {
  private client: ReturnType<typeof createClient>;

  constructor() {
    this.client = createClient({
      socket: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
      },
    });

    this.client.on('error', (err) => console.error('Redis Client Error', err));
    this.connect();
  }

  private async connect(): Promise<void> {
    try {
      await this.client.connect();
      console.log('✅ Connected to Redis');
    } catch (error) {
      console.error('❌ Redis connection error:', error);
    }
  }

  async get(key: string): Promise<string | null> {
    return await this.client.get(key);
  }

  async set(key: string, value: string, ttl: number = 3600): Promise<void> {
    await this.client.set(key, value, { EX: ttl });
  }

  async del(key: string): Promise<void> {
    await this.client.del(key);
  }

  async disconnect(): Promise<void> {
    await this.client.disconnect();
  }
}
