import Joi from 'joi';

/**
 * Variables d'environnement de l'application, validées une fois au démarrage.
 * Une variable obligatoire absente ou invalide arrête le processus avec un message explicite :
 * pas de secret de repli, pas de port deviné.
 */
export interface Env {
  NODE_ENV: 'development' | 'test' | 'production';
  PORT: number;
  DATABASE_URL: string;
  REDIS_URL: string;
  JWT_ACCESS_SECRET: string;
  JWT_REFRESH_SECRET: string;
  JWT_ACCESS_EXPIRES_IN: string;
  JWT_REFRESH_EXPIRES_IN: string;
  BCRYPT_ROUNDS: number;
}

const envSchema = Joi.object<Env>({
  NODE_ENV: Joi.string().valid('development', 'test', 'production').default('development'),
  PORT: Joi.number().integer().min(1).max(65535).default(3000),
  DATABASE_URL: Joi.string()
    .uri({ scheme: ['postgresql', 'postgres'] })
    .required(),
  REDIS_URL: Joi.string()
    .uri({ scheme: ['redis', 'rediss'] })
    .required(),
  // Deux secrets distincts (D-12), 32 caractères minimum, sans valeur de repli.
  JWT_ACCESS_SECRET: Joi.string().min(32).required(),
  JWT_REFRESH_SECRET: Joi.string()
    .min(32)
    .invalid(Joi.ref('JWT_ACCESS_SECRET'))
    .required()
    .messages({ 'any.invalid': '"JWT_REFRESH_SECRET" doit différer de JWT_ACCESS_SECRET' }),
  // Durées D-23.
  JWT_ACCESS_EXPIRES_IN: Joi.string().default('1h'),
  JWT_REFRESH_EXPIRES_IN: Joi.string().default('30d'),
  BCRYPT_ROUNDS: Joi.number().integer().min(4).max(15).default(12),
}).unknown(true);

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const result = envSchema.validate(source, { abortEarly: false, stripUnknown: true });
  if (result.error) {
    const details = result.error.details.map((d) => `  - ${d.message}`).join('\n');
    throw new Error(`Configuration invalide (variables d'environnement) :\n${details}`);
  }
  return result.value;
}
