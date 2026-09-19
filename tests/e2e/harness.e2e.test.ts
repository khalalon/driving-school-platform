/**
 * Auto-contrôle du harnais : la passerelle répond et le seed (fixtures/seed.sql) est en base.
 * Pas de règle métier ici : le chemin critique est dans critical-path.e2e.test.ts.
 */
import { api, expectStatus, login, SEED } from '../helpers/api';

describe('Harnais e2e', () => {
  test('la passerelle répond sur /health', async () => {
    const res = await api().get('/health');
    expectStatus(res, 200, 'GET /health');
  });

  test("l'instructeur du seed peut se connecter (A1)", async () => {
    const tokens = await login(SEED.instructor.email, SEED.instructor.password);
    expect(typeof tokens.accessToken).toBe('string');
    expect(tokens.accessToken.length).toBeGreaterThan(20);
  });

  test("l'école du seed est visible (S1)", async () => {
    const res = await api().get('/api/schools');
    expectStatus(res, 200, 'GET /api/schools');
    const names = (res.body as Array<{ id: string; name: string }>).map((s) => s.name);
    expect(names).toContain(SEED.schoolName);
  });

  test("l'école du seed porte sa devise (S2, D-43) : TND", async () => {
    const res = await api().get(`/api/schools/${SEED.schoolId}`);
    expectStatus(res, 200, 'GET /api/schools/:id');
    expect((res.body as { currency: string }).currency).toBe(SEED.currency);
  });
});
