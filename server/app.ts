import compression from 'compression';
import cors from 'cors';
import express, { type Express } from 'express';
import { rateLimit } from 'express-rate-limit';
import helmet from 'helmet';
import { authenticate, type TokenVerifier } from './auth';
import { errorHandler, HttpError } from './errors';
import type { Repository } from './repo/types';
import { adminRouter } from './routes/admin';
import { publicRouter } from './routes/public';
import type { FileStorage } from './storage/types';

export interface AppDeps {
  repo: Repository;
  storage: FileStorage;
  verifier: TokenVerifier;
  adminEmails: string[];
  corsOrigins?: string[];
  maxUploadBytes?: number;
  /** Solicitudes de escritura pública permitidas por IP cada 15 minutos. */
  publicWriteLimit?: number;
  trustProxy?: boolean;
}

export function createApp(deps: AppDeps): Express {
  const app = express();
  app.disable('x-powered-by');
  if (deps.trustProxy) app.set('trust proxy', 1);

  app.use(
    helmet({
      // La web carga imágenes y mapas de otros dominios y usa el popup de Google para iniciar sesión.
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
      crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
    }),
  );
  app.use(compression());
  if (deps.corsOrigins?.length) app.use('/api', cors({ origin: deps.corsOrigins }));
  app.use(express.json({ limit: '200kb' }));

  const writeLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: deps.publicWriteLimit ?? 20,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler: (_req, _res, next) =>
      next(new HttpError(429, 'rate_limited', 'Demasiadas solicitudes. Espera unos minutos e inténtalo de nuevo.')),
  });

  const api = express.Router();
  api.use((_req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
  });
  api.use(authenticate(deps.verifier, deps.repo, deps.adminEmails));
  api.use(publicRouter({ repo: deps.repo, writeLimiter }));
  api.use('/admin', adminRouter({ repo: deps.repo, storage: deps.storage, maxUploadBytes: deps.maxUploadBytes ?? 8 * 1024 * 1024 }));
  api.use((req, _res, next) => next(new HttpError(404, 'not_found', `No existe la ruta ${req.method} ${req.originalUrl}.`)));
  api.use(errorHandler);

  app.use('/api', api);
  return app;
}
