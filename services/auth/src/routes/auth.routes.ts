import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { AuthMiddleware } from '../middleware/auth.middleware';

export class AuthRoutes {
  constructor(
    private readonly authController: AuthController,
    private readonly authMiddleware: AuthMiddleware
  ) {}

  createRouter(): Router {
    const router = Router();

    router.post('/register', this.authController.register);
    router.post('/login', this.authController.login);
    router.post('/refresh', this.authController.refresh);
    router.post('/logout', this.authMiddleware.authenticate, this.authController.logout);
    router.get('/me', this.authMiddleware.authenticate, this.authController.getCurrentUser);

    return router;
  }
}
