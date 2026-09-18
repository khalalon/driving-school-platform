import { Router } from 'express';
import { Pool } from 'pg';
import { RedisClientType } from 'redis';
import { Env } from '../../config/env';
import { AuthController } from './controllers/auth.controller';
import { AuthMiddleware } from './middleware/auth.middleware';
import { UserRepository } from './repositories/user.repository';
import { createAuthRouter } from './routes/auth.routes';
import { AuthService } from './services/auth.service';
import { CacheService } from './services/cache.service';
import { PasswordService } from './services/password.service';
import { TokenService } from './services/token.service';

export interface AuthModuleDeps {
  db: Pool;
  redis: RedisClientType;
  env: Pick<Env, 'JWT_SECRET' | 'JWT_EXPIRES_IN' | 'JWT_REFRESH_EXPIRES_IN' | 'BCRYPT_ROUNDS'>;
}

export interface AuthModule {
  router: Router;
  tokenService: TokenService;
  middleware: AuthMiddleware;
}

/** Câblage du module (repositories → services → controller → routeur), sans singleton. */
export function buildAuthModule({ db, redis, env }: AuthModuleDeps): AuthModule {
  const userRepository = new UserRepository(db);
  const passwordService = new PasswordService(env.BCRYPT_ROUNDS);
  const tokenService = new TokenService({
    secret: env.JWT_SECRET,
    accessTokenExpiry: env.JWT_EXPIRES_IN,
    refreshTokenExpiry: env.JWT_REFRESH_EXPIRES_IN,
  });
  const cacheService = new CacheService(redis);
  const authService = new AuthService(userRepository, passwordService, tokenService, cacheService);
  const controller = new AuthController(authService);
  const middleware = new AuthMiddleware(tokenService);

  return { router: createAuthRouter(controller, middleware), tokenService, middleware };
}
