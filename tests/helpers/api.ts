import request, { Response } from 'supertest';

export const GATEWAY_URL = process.env.GATEWAY_URL ?? 'http://localhost';

/** Données insérées par fixtures/seed.sql (identifiants fixes). */
export const SEED = {
  schoolId: '11111111-1111-4111-8111-111111111111',
  schoolName: 'Seed Driving School',
  schoolCode: 'INST-SEED',
  instructor: {
    userId: '22222222-2222-4222-8222-222222222222',
    instructorId: '33333333-3333-4333-8333-333333333333',
    email: 'instructor@seed.io',
    password: 'Seed1234!',
  },
  pricing: { CODE: 20, Manœuvre: 35, Parc: 40 } as Record<string, number>,
  lessonDurationMinutes: 60,
  currency: 'TND',
};

export interface Tokens {
  accessToken: string;
  refreshToken: string;
}

/** Client supertest sur la passerelle (une requête = un appel). */
export const api = (): request.Agent => request(GATEWAY_URL);

export const bearer = (token: string): Record<string, string> => ({
  Authorization: `Bearer ${token}`,
});

/** Email unique par campagne : la base n'est pas purgée entre deux exécutions. */
export const uniqueEmail = (prefix = 'e2e-student'): string =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@seed.io`;

/** Date ISO à `days` jours dans le futur, à l'heure donnée (par défaut 10 h). */
export const futureDate = (days: number, hour = 10): string => {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);
  date.setUTCHours(hour, 0, 0, 0);
  return date.toISOString();
};

/**
 * Vérifie le statut HTTP et, en cas d'écart, échoue avec le corps de la réponse :
 * l'étape en échec du chemin critique se lit directement dans la sortie Jest.
 */
export function expectStatus(res: Response, expected: number, step: string): void {
  if (res.status !== expected) {
    throw new Error(
      `${step} : attendu HTTP ${expected}, reçu ${res.status} — ${JSON.stringify(res.body)}`
    );
  }
}

export async function login(email: string, password: string): Promise<Tokens> {
  const res = await api().post('/api/auth/login').send({ email, password });
  expectStatus(res, 200, `A1 login ${email}`);
  return res.body as Tokens;
}

/**
 * Étapes dépendantes dans un même fichier : `--bail` de Jest n'arrête qu'entre fichiers.
 * `step()` mémorise la première étape en échec et fait échouer les suivantes aussitôt, avec
 * un message qui la désigne — la sortie montre une seule vraie erreur.
 */
let firstFailedStep: string | null = null;

export function step(name: string, fn: () => Promise<void>): void {
  test(name, async () => {
    if (firstFailedStep) {
      throw new Error(`Étape non exécutée : échec en amont à « ${firstFailedStep} »`);
    }
    try {
      await fn();
    } catch (err) {
      firstFailedStep = name;
      throw err;
    }
  });
}
