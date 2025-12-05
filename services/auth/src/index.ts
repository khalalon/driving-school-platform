import dotenv from 'dotenv';
import { DatabaseConfig } from './config/database.config';
import { RedisConfig } from './config/redis.config';
import { UserRepository } from './repositories/user.repository';
import { PasswordService } from './services/password.service';
import { TokenService } from './services/token.service';
import { CacheService } from './services/cache.service';
import { AuthService } from './services/auth.service';
import { AuthController } from './controllers/auth.controller';
import { AuthMiddleware } from './middleware/auth.middleware';
import { AuthRoutes } from './routes/auth.routes';
import { App } from './app';

dotenv.config();

async function bootstrap(): Promise<void> {
  try {
    const port = process.env.PORT || 3001;

    const db = DatabaseConfig.getInstance();
    const redis = await RedisConfig.getInstance();

    const userRepository = new UserRepository(db);

    const passwordService = new PasswordService();
    const tokenService = new TokenService();
    const cacheService = new CacheService(redis);
    const authService = new AuthService(
      userRepository,
      passwordService,
      tokenService,
      cacheService
    );

    const authController = new AuthController(authService);
    const authMiddleware = new AuthMiddleware(tokenService);

    const authRoutes = new AuthRoutes(authController, authMiddleware);

    const app = new App(authRoutes);

    app.getApp().listen(port, () => {
      console.log(`✅ Auth service running on port ${port}`);
    });
  } catch (error) {
    console.error('❌ Failed to start auth service:', error);
    process.exit(1);
  }
}

bootstrap().catch((error) => {
  console.error('Fatal error during bootstrap:', error);
  process.exit(1);
});
