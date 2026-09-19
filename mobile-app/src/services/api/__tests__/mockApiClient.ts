/**
 * Double d'`ApiClient` pour les tests des `*Service.ts` : on vérifie l'URL, le verbe et le
 * payload envoyés, et que chaque méthode renvoie `response.data` (D-13). Aucun réseau.
 *
 * Usage : `jest.mock('../ApiClient', () => mockApiClientModule())` en tête du test, puis
 * `const api = mockedApiClient()` pour piloter les réponses.
 */
import type { AxiosResponse } from 'axios';

export interface MockedApiClient {
  get: jest.Mock;
  post: jest.Mock;
  put: jest.Mock;
  delete: jest.Mock;
}

export const mockApiClientModule = (): { apiClient: MockedApiClient } => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  },
});

/** L'instance mockée, telle qu'importée par le service sous test. */
export const mockedApiClient = (): MockedApiClient =>
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  (require('../ApiClient') as { apiClient: MockedApiClient }).apiClient;

/** Une réponse axios minimale portant `data`. */
export const respond = <T>(data: T, status = 200): AxiosResponse<T> =>
  ({ data, status, statusText: 'OK', headers: {}, config: {} }) as unknown as AxiosResponse<T>;
