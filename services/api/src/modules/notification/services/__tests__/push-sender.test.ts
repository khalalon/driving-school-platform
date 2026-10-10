import { PushMessage } from '../../types/notification.types';
import { EXPO_PUSH_CHUNK, ExpoPushSender } from '../expo-push-sender';
import { LogPushSender } from '../push-sender';

const message = (tokens: string[]): PushMessage => ({
  tokens,
  title: 'Leçon planifiée',
  body: 'Votre leçon Parc est fixée au 15 octobre.',
  data: { screen: 'MyLessons', id: 'lesson-1' },
});

/** Réponse de l'API push d'Expo, réduite à ce que l'envoyeur lit. */
const expoResponse = (tickets: unknown[], ok = true) => ({
  ok,
  status: ok ? 200 : 500,
  json: () => Promise.resolve({ data: tickets }),
});

describe('LogPushSender (17.3)', () => {
  it('journalise au lieu d’envoyer, et ne déclare aucun jeton mort', async () => {
    const lines: string[] = [];
    const sender = new LogPushSender((line) => lines.push(line));

    await expect(sender.send([message(['t1', 't2'])])).resolves.toEqual({ invalidTokens: [] });
    expect(lines).toHaveLength(1);
    expect(lines[0]).toContain('2 appareil(s)');
    expect(lines[0]).toContain('Leçon planifiée');
    expect(lines[0]).toContain('MyLessons');
  });
});

describe('ExpoPushSender (17.3)', () => {
  it('un message par jeton, par paquets de 100', async () => {
    const tokens = Array.from({ length: 150 }, (_unused, index) => `t${index}`);
    const fetchImpl = jest
      .fn()
      .mockResolvedValue(expoResponse(Array(EXPO_PUSH_CHUNK).fill({ status: 'ok' })));

    await new ExpoPushSender(() => undefined, fetchImpl as unknown as typeof fetch).send([
      message(tokens),
    ]);

    expect(fetchImpl).toHaveBeenCalledTimes(2);
    const [url, init] = fetchImpl.mock.calls[0] as [string, { body: string; method: string }];
    expect(url).toBe('https://exp.host/--/api/v2/push/send');
    expect(init.method).toBe('POST');
    const sent = JSON.parse(init.body) as { to: string; title: string; data: unknown }[];
    expect(sent).toHaveLength(EXPO_PUSH_CHUNK);
    expect(sent[0]).toMatchObject({
      to: 't0',
      title: 'Leçon planifiée',
      data: { screen: 'MyLessons', id: 'lesson-1' },
    });
    // Le second paquet porte les 50 restants
    const second = JSON.parse(
      (fetchImpl.mock.calls[1] as [string, { body: string }])[1].body
    ) as unknown[];
    expect(second).toHaveLength(50);
  });

  it('`DeviceNotRegistered` renvoie le jeton mort, les autres erreurs ne suppriment rien', async () => {
    const warnings: string[] = [];
    const fetchImpl = jest
      .fn()
      .mockResolvedValue(
        expoResponse([
          { status: 'ok' },
          { status: 'error', details: { error: 'DeviceNotRegistered' } },
          { status: 'error', details: { error: 'MessageRateExceeded' } },
        ])
      );

    const result = await new ExpoPushSender(
      (line) => warnings.push(line),
      fetchImpl as unknown as typeof fetch
    ).send([message(['vivant', 'mort', 'trop-vite'])]);

    expect(result.invalidTokens).toEqual(['mort']);
    expect(warnings.join(' ')).toContain('MessageRateExceeded');
  });

  it('réseau coupé ou HTTP en erreur : rien n’est supprimé, tout est journalisé', async () => {
    const warnings: string[] = [];

    const offline = new ExpoPushSender(
      (line) => warnings.push(line),
      jest.fn().mockRejectedValue(new Error('ECONNREFUSED')) as unknown as typeof fetch
    );
    await expect(offline.send([message(['t1'])])).resolves.toEqual({ invalidTokens: [] });

    const broken = new ExpoPushSender(
      (line) => warnings.push(line),
      jest.fn().mockResolvedValue(expoResponse([], false)) as unknown as typeof fetch
    );
    await expect(broken.send([message(['t1'])])).resolves.toEqual({ invalidTokens: [] });

    expect(warnings.join(' | ')).toContain('ECONNREFUSED');
    expect(warnings.join(' | ')).toContain('HTTP 500');
  });

  it('aucun jeton : aucune requête', async () => {
    const fetchImpl = jest.fn();
    await new ExpoPushSender(() => undefined, fetchImpl as unknown as typeof fetch).send([
      message([]),
    ]);
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});

describe('journaux par défaut (17.3)', () => {
  it('LogPushSender sans journal fourni écrit sur la console', async () => {
    const info = jest.spyOn(console, 'info').mockImplementation(() => undefined);

    await new LogPushSender().send([message(['t1'])]);

    expect(info).toHaveBeenCalledTimes(1);
    info.mockRestore();
  });

  it('ExpoPushSender sans journal fourni avertit sur la console', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const fetchSpy = jest.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('réseau coupé'));

    await expect(new ExpoPushSender().send([message(['t1'])])).resolves.toEqual({
      invalidTokens: [],
    });

    expect(warn).toHaveBeenCalled();
    fetchSpy.mockRestore();
    warn.mockRestore();
  });
});
