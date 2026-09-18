import { RedisClientType } from 'redis';
import { CacheService } from '../cache.service';

describe('CacheService (Redis)', () => {
  const redis = {
    set: jest.fn().mockResolvedValue('OK'),
    setEx: jest.fn().mockResolvedValue('OK'),
    get: jest.fn().mockResolvedValue('value'),
    getDel: jest.fn().mockResolvedValue('value'),
    del: jest.fn().mockResolvedValue(1),
  };
  const cache = new CacheService(redis as unknown as RedisClientType);

  it('set : SETEX avec TTL, SET sans', async () => {
    await cache.set('k', 'v', 60);
    await cache.set('k2', 'v2');

    expect(redis.setEx).toHaveBeenCalledWith('k', 60, 'v');
    expect(redis.set).toHaveBeenCalledWith('k2', 'v2');
  });

  it('get, take (GETDEL : lecture et suppression atomiques), delete', async () => {
    await expect(cache.get('k')).resolves.toBe('value');
    await expect(cache.take('k')).resolves.toBe('value');
    await cache.delete('k');

    expect(redis.get).toHaveBeenCalledWith('k');
    expect(redis.getDel).toHaveBeenCalledWith('k');
    expect(redis.del).toHaveBeenCalledWith('k');
  });
});
