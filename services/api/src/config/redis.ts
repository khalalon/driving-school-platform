import { createClient, RedisClientType } from 'redis';

export async function createRedisClient(url: string): Promise<RedisClientType> {
  const client = createClient({ url }) as RedisClientType;
  client.on('error', (err: Error) => {
    console.error('Redis :', err.message);
  });
  await client.connect();
  return client;
}
