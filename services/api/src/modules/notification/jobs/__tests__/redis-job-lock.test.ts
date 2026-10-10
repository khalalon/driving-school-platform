import { RedisJobLock } from '../redis-job-lock';

/** Verrou des tâches planifiées (17.5) : une seule instance de l'API passe à la fois. */
describe('RedisJobLock', () => {
  const redis = { set: jest.fn(), eval: jest.fn() };
  const lock = new RedisJobLock(redis as never);

  beforeEach(() => jest.clearAllMocks());

  it('acquire : SET NX PX ; un jeton si la clé était libre, null sinon', async () => {
    redis.set.mockResolvedValueOnce('OK').mockResolvedValueOnce(null);

    const token = await lock.acquire('jobs:x', 1000);
    expect(token).toEqual(expect.any(String));
    expect(redis.set).toHaveBeenCalledWith('jobs:x', token, { NX: true, PX: 1000 });

    await expect(lock.acquire('jobs:x', 1000)).resolves.toBeNull();
  });

  it('release : ne supprime la clé que si elle porte encore notre jeton (script atomique)', async () => {
    redis.eval.mockResolvedValue(1);

    await lock.release('jobs:x', 'mon-jeton');

    const [script, options] = redis.eval.mock.calls[0] as [
      string,
      { keys: string[]; arguments: string[] },
    ];
    expect(script).toContain("redis.call('GET', KEYS[1]) == ARGV[1]");
    expect(options).toEqual({ keys: ['jobs:x'], arguments: ['mon-jeton'] });
  });
});
