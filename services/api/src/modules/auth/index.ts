import { RequestHandler, Router } from 'express';
import { Pool } from 'pg';
import { RedisClientType } from 'redis';
import { Env } from '../../config/env';
import { PgTransactionRunner } from '../../db/transaction';
import { authenticate } from '../../middleware/auth.middleware';
import { SchoolCodeRepository } from '../school/repositories/school-code.repository';
import { AuthController } from './controllers/auth.controller';
import { UserRepository } from './repositories/user.repository';
import { createAuthRouter } from './routes/auth.routes';
import { AuthService } from './services/auth.service';
import { CacheService } from './services/cache.service';
import { PasswordService } from './services/password.service';
import { TokenService } from './services/token.service';
import { InstructorAccess } from './types/auth.types';

export interface AuthModuleDeps {
  db: Pool;
  redis: RedisClientType;
  env: Pick<
    Env,
    | 'JWT_ACCESS_SECRET'
    | 'JWT_REFRESH_SECRET'
    | 'JWT_ACCESS_EXPIRES_IN'
    | 'JWT_REFRESH_EXPIRES_IN'
    | 'BCRYPT_ROUNDS'
  >;
  /** `InstructorRepository` du module school : fiche créée à l'inscription (D-17), école pour A3 (D-19). */
  instructors: InstructorAccess;
}

export interface AuthModule {
  router: Router;
  tokenService: TokenService;
  /** `authenticate` câblé sur le TokenService : à réutiliser par tous les autres modules. */
  requireAuth: RequestHandler;
}

/** Câblage du module (repositories → services → controller → routeur), sans singleton. */
export function buildAuthModule({ db, redis, env, instructors }: AuthModuleDeps): AuthModule {
  const userRepository = new UserRepository(db);
  const passwordService = new PasswordService(env.BCRYPT_ROUNDS);
  const tokenService = new TokenService({
    accessSecret: env.JWT_ACCESS_SECRET,
    refreshSecret: env.JWT_REFRESH_SECRET,
    accessTokenExpiry: env.JWT_ACCESS_EXPIRES_IN,
    refreshTokenExpiry: env.JWT_REFRESH_EXPIRES_IN,
  });
  const cacheService = new CacheService(redis);
  // Inscription avec code d'école (D-17) : repositories du module school, injectés ici.
  const authService = new AuthService(
    userRepository,
    passwordService,
    tokenService,
    cacheService,
    new SchoolCodeRepository(db),
    instructors,
    new PgTransactionRunner(db)
  );
  const controller = new AuthController(authService);
  const requireAuth = authenticate(tokenService);

  return { router: createAuthRouter(controller, requireAuth), tokenService, requireAuth };
}
