import express, { Application, Router } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { sendError } from './http/errors';

/** Routeurs fournis par les modules ; chaque clé est un préfixe `/api/<clé>`. */
export interface AppRouters {
  auth: Router;
  schools?: Router;
  enrollment?: Router;
  profiles?: Router;
  'student-profiles'?: Router;
  verification?: Router;
}

/**
 * Application Express unique. Les modules fournissent leurs routeurs ; ce fichier ne connaît
 * que les préfixes `/api/<domaine>` et les middlewares transverses.
 */
export function createApp(routers: AppRouters): Application {
  const app = express();

  app.use(helmet());
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  // Garde-fou applicatif ; la vraie limitation par route est faite par Nginx.
  app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 1000, standardHeaders: true }));

  app.get('/health', (_req, res) => {
    res.status(200).json({ status: 'ok' });
  });

  for (const prefix of Object.keys(routers) as (keyof AppRouters)[]) {
    const router = routers[prefix];
    if (router) {
      app.use(`/api/${prefix}`, router);
    }
  }

  app.use((_req, res) => {
    sendError(res, 404, 'NOT_FOUND', 'Route inconnue');
  });

  return app;
}
