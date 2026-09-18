import { RequestHandler, Router } from 'express';
import { AuthController } from '../controllers/auth.controller';

export function createAuthRouter(controller: AuthController, requireAuth: RequestHandler): Router {
  const router = Router();

  router.post('/register', controller.register);
  router.post('/login', controller.login);
  router.post('/refresh', controller.refresh);
  router.post('/logout', requireAuth, controller.logout);
  router.get('/me', requireAuth, controller.getCurrentUser);

  return router;
}
