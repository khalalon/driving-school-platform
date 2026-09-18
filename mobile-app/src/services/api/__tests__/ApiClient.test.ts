/**
 * Intercepteur de refresh (D-12, tâche 4.5). Axios est mocké au niveau de son adaptateur
 * (aucun réseau) ; AsyncStorage est le mock officiel (jest.setup.js).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios, { AxiosError, AxiosRequestConfig, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { ApiClient, REFRESH_TOKEN_KEY, TOKEN_KEY, USER_KEY } from '../ApiClient';

type Adapter = (config: InternalAxiosRequestConfig) => Promise<AxiosResponse>;

const ok = (config: InternalAxiosRequestConfig, data: unknown): AxiosResponse => ({
  data,
  status: 200,
  statusText: 'OK',
  headers: {},
  config,
});

const unauthorized = (config: InternalAxiosRequestConfig): AxiosError =>
  new AxiosError('Unauthorized', AxiosError.ERR_BAD_REQUEST, config, null, {
    data: { error: 'UNAUTHORIZED', message: 'Jeton invalide ou expiré' },
    status: 401,
    statusText: 'Unauthorized',
    headers: {},
    config,
  });

function buildClient(apiAdapter: jest.Mock, refreshAdapter: jest.Mock): ApiClient {
  const make = (adapter: jest.Mock): ReturnType<typeof axios.create> =>
    axios.create({ baseURL: 'http://api.test', adapter: adapter as unknown as Adapter });
  return new ApiClient(make(apiAdapter), make(refreshAdapter));
}

const authHeader = (config: AxiosRequestConfig | undefined): string | undefined =>
  (config?.headers as Record<string, string> | undefined)?.Authorization;

describe('ApiClient — refresh token sur 401', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    await AsyncStorage.multiSet([
      [TOKEN_KEY, 'old-access'],
      [REFRESH_TOKEN_KEY, 'old-refresh'],
      [USER_KEY, '{"id":"u1"}'],
    ]);
  });

  it('ajoute le Bearer courant à chaque requête', async () => {
    const api = jest.fn((config: InternalAxiosRequestConfig) =>
      Promise.resolve(ok(config, { fine: true }))
    );
    const client = buildClient(api, jest.fn());

    const res = await client.get('/api/schools');

    expect(res.data).toEqual({ fine: true });
    expect(authHeader(api.mock.calls[0][0])).toBe('Bearer old-access');
  });

  it('401 → refresh une fois, nouvelle paire stockée, requête rejouée avec le nouveau jeton', async () => {
    const api = jest
      .fn()
      .mockImplementationOnce((config: InternalAxiosRequestConfig) =>
        Promise.reject(unauthorized(config))
      )
      .mockImplementationOnce((config: InternalAxiosRequestConfig) =>
        Promise.resolve(ok(config, { replayed: true }))
      );
    const refresh = jest.fn((config: InternalAxiosRequestConfig) =>
      Promise.resolve(ok(config, { accessToken: 'new-access', refreshToken: 'new-refresh' }))
    );
    const client = buildClient(api, refresh);

    const res = await client.get('/api/lessons');

    expect(res.data).toEqual({ replayed: true });
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(refresh.mock.calls[0][0].url).toBe('/api/auth/refresh');
    expect(JSON.parse(refresh.mock.calls[0][0].data as string)).toEqual({
      refreshToken: 'old-refresh',
    });
    expect(api).toHaveBeenCalledTimes(2);
    expect(authHeader(api.mock.calls[1][0])).toBe('Bearer new-access');
    await expect(AsyncStorage.getItem(TOKEN_KEY)).resolves.toBe('new-access');
    await expect(AsyncStorage.getItem(REFRESH_TOKEN_KEY)).resolves.toBe('new-refresh');
  });

  it('refresh refusé → session effacée, handler prévenu, erreur 401 d’origine propagée, un seul essai', async () => {
    const api = jest.fn((config: InternalAxiosRequestConfig) =>
      Promise.reject(unauthorized(config))
    );
    const refresh = jest.fn((config: InternalAxiosRequestConfig) =>
      Promise.reject(unauthorized(config))
    );
    const client = buildClient(api, refresh);
    const expired = jest.fn();
    client.onSessionExpired(expired);

    await expect(client.get('/api/lessons')).rejects.toMatchObject({ response: { status: 401 } });

    expect(refresh).toHaveBeenCalledTimes(1);
    expect(api).toHaveBeenCalledTimes(1);
    expect(expired).toHaveBeenCalledTimes(1);
    await expect(AsyncStorage.getItem(TOKEN_KEY)).resolves.toBeNull();
    await expect(AsyncStorage.getItem(REFRESH_TOKEN_KEY)).resolves.toBeNull();
    await expect(AsyncStorage.getItem(USER_KEY)).resolves.toBeNull();
  });

  it('sans refresh token en stockage : pas d’appel refresh, session expirée', async () => {
    await AsyncStorage.removeItem(REFRESH_TOKEN_KEY);
    const api = jest.fn((config: InternalAxiosRequestConfig) =>
      Promise.reject(unauthorized(config))
    );
    const refresh = jest.fn();
    const client = buildClient(api, refresh);
    const expired = jest.fn();
    client.onSessionExpired(expired);

    await expect(client.get('/api/lessons')).rejects.toMatchObject({ response: { status: 401 } });

    expect(refresh).not.toHaveBeenCalled();
    expect(expired).toHaveBeenCalledTimes(1);
  });

  it('deux 401 simultanés partagent un seul appel refresh', async () => {
    const api = jest.fn((config: InternalAxiosRequestConfig) => {
      const retried = (config as InternalAxiosRequestConfig & { _retry?: boolean })._retry;
      return retried
        ? Promise.resolve(ok(config, { url: config.url }))
        : Promise.reject(unauthorized(config));
    });
    const refresh = jest.fn((config: InternalAxiosRequestConfig) =>
      Promise.resolve(ok(config, { accessToken: 'new-access', refreshToken: 'new-refresh' }))
    );
    const client = buildClient(api, refresh);

    const [a, b] = await Promise.all([client.get('/api/a'), client.get('/api/b')]);

    expect(a.data).toEqual({ url: '/api/a' });
    expect(b.data).toEqual({ url: '/api/b' });
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('une erreur autre que 401 est propagée sans refresh', async () => {
    const api = jest.fn((config: InternalAxiosRequestConfig) =>
      Promise.reject(
        new AxiosError('Server', AxiosError.ERR_BAD_RESPONSE, config, null, {
          data: { error: 'INTERNAL_ERROR' },
          status: 500,
          statusText: 'Internal Server Error',
          headers: {},
          config,
        })
      )
    );
    const refresh = jest.fn();
    const client = buildClient(api, refresh);

    await expect(client.get('/api/lessons')).rejects.toMatchObject({ response: { status: 500 } });
    expect(refresh).not.toHaveBeenCalled();
  });
});
