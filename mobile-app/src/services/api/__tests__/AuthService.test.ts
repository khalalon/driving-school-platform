/**
 * AuthService — A1, A2, A3, A5 du contrat : URL, verbe, payload, et `response.data` renvoyé.
 */
import { mockApiClientModule, mockedApiClient, respond } from './mockApiClient';

jest.mock('../ApiClient', () => mockApiClientModule());

import { authService } from '../AuthService';
import { UserRole } from '../../../models/User';

const api = mockedApiClient();
const tokens = { accessToken: 'access', refreshToken: 'refresh' };

describe('AuthService', () => {
  it('login (A1) : POST /api/auth/login { email, password } → la paire de jetons', async () => {
    api.post.mockResolvedValue(respond(tokens));

    const result = await authService.login({ email: 'eleve@test.io', password: 'Passw0rd!' });

    expect(api.post).toHaveBeenCalledWith('/api/auth/login', {
      email: 'eleve@test.io',
      password: 'Passw0rd!',
    });
    expect(result).toEqual(tokens);
  });

  it('register (A2, élève) : POST /api/auth/register sans role ni schoolCode', async () => {
    api.post.mockResolvedValue(respond(tokens, 201));
    const data = { email: 'x@x.io', password: 'Passw0rd!', firstName: 'Ali', lastName: 'Ben' };

    const result = await authService.register(data);

    expect(api.post).toHaveBeenCalledWith('/api/auth/register', data);
    expect(api.post.mock.calls[0][1]).not.toHaveProperty('role');
    expect(result).toEqual(tokens);
  });

  it('register (A2, instructeur) : schoolCode, phone et licenseNumber transmis tels quels (D-17)', async () => {
    api.post.mockResolvedValue(respond(tokens, 201));
    const data = {
      email: 'i@x.io',
      password: 'Passw0rd!',
      firstName: 'Sami',
      lastName: 'Instr',
      phone: '+21600000000',
      licenseNumber: 'LIC-1',
      schoolCode: 'INST-SEED',
    };

    await authService.register(data);

    expect(api.post).toHaveBeenCalledWith('/api/auth/register', data);
  });

  it('register (A2) : les coordonnees facultatives partent telles quelles (D-50)', async () => {
    api.post.mockResolvedValue(respond(tokens, 201));
    const data = {
      email: 'x@x.io',
      password: 'Passw0rd!',
      firstName: 'Nour',
      lastName: 'Cherif',
      phone: '+216 20 123 456',
      dateOfBirth: '2001-03-09',
      address: '5 avenue Habib Bourguiba',
      emergencyContact: 'Leila Cherif',
      emergencyPhone: '+216 20 999 888',
    };

    await authService.register(data);

    expect(api.post).toHaveBeenCalledWith('/api/auth/register', data);
  });

  it('getCurrentUser (A3) : GET /api/auth/me → l’utilisateur, avec schoolId / instructorId (D-19)', async () => {
    const me = {
      id: 'u1',
      email: 'i@x.io',
      firstName: 'Sami',
      lastName: 'Instr',
      role: UserRole.INSTRUCTOR,
      createdAt: '2026-09-19T00:00:00.000Z',
      schoolId: 's1',
      instructorId: 'i1',
    };
    api.get.mockResolvedValue(respond(me));

    const result = await authService.getCurrentUser();

    expect(api.get).toHaveBeenCalledWith('/api/auth/me');
    expect(result).toEqual(me);
  });

  it('logout (A5) : POST /api/auth/logout sans corps', async () => {
    api.post.mockResolvedValue(respond(undefined, 204));

    await expect(authService.logout()).resolves.toBeUndefined();

    expect(api.post).toHaveBeenCalledWith('/api/auth/logout');
  });

  it('propage l’erreur du backend (D-27) sans la transformer', async () => {
    const error = {
      response: { status: 401, data: { error: 'UNAUTHORIZED', message: 'Identifiants invalides' } },
    };
    api.post.mockRejectedValue(error);

    await expect(authService.login({ email: 'x@x.io', password: 'bad' })).rejects.toBe(error);
  });
});
