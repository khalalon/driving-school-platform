import { randomUUID } from 'crypto';
import { RedisClientType } from 'redis';
import { JobLock } from './lesson-reminder.job';

/**
 * Libère le verrou **seulement s'il est encore à nous** : si un passage a dépassé le délai et
 * qu'une autre instance a repris la main, effacer la clé lui retirerait son verrou.
 * Comparaison et suppression en un seul script Lua, donc atomiques.
 */
const RELEASE_IF_OWNER = `
if redis.call('GET', KEYS[1]) == ARGV[1] then
  return redis.call('DEL', KEYS[1])
end
return 0`;

/** Ce que le verrou utilise du client Redis ; le reste du client ne le concerne pas. */
type LockClient = Pick<RedisClientType, 'set' | 'eval'>;

/** Verrou distribué pour les tâches planifiées (17.5) : `SET NX PX` + libération conditionnelle. */
export class RedisJobLock implements JobLock {
  constructor(private readonly redis: LockClient) {}

  async acquire(key: string, ttlMs: number): Promise<string | null> {
    const token = randomUUID();
    const result = await this.redis.set(key, token, { NX: true, PX: ttlMs });
    return result === 'OK' ? token : null;
  }

  async release(key: string, token: string): Promise<void> {
    await this.redis.eval(RELEASE_IF_OWNER, { keys: [key], arguments: [token] });
  }
}
