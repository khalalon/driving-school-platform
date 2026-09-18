import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { AuthMiddleware } from '../middleware/auth.middleware';

export function createAuthRouter(controller: AuthController, middleware: AuthMiddleware): Router {
  const router = Router();

  router.post('/register', controller.register);
  router.post('/login', controller.login);
  router.post('/refresh', controller.refresh);
  router.post('/logout', middleware.authenticate, controller.logout);
  router.get('/me', middleware.authenticate, controller.getCurrentUser);

  return router;
}
