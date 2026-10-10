import type { RequestHandler } from 'express';
import type { Repository } from './repo/types';
import { HttpError } from './errors';

export interface AuthUser {
  uid: string;
  email: string | null;
  emailVerified: boolean;
  name: string | null;
  isAdmin: boolean;
}

export interface TokenVerifier {
  /** Verifica un ID token de Firebase Auth; lanza un error si no es válido. */
  verify(token: string): Promise<Omit<AuthUser, 'isAdmin'>>;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

/**
 * Lee el header `Authorization: Bearer <idToken>` si existe y deja el usuario en `req.user`.
 * Un token inválido responde 401 para que el cliente sepa que debe volver a iniciar sesión.
 */
export function authenticate(verifier: TokenVerifier, repo: Repository, adminEmails: string[]): RequestHandler {
  return async (req, _res, next) => {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) return next();
    try {
      const user = await verifier.verify(header.slice(7));
      const emailIsAdmin =
        user.email !== null && user.emailVerified && adminEmails.includes(user.email.toLowerCase());
      req.user = { ...user, isAdmin: emailIsAdmin || (await repo.isAdminUid(user.uid)) };
      next();
    } catch {
      next(new HttpError(401, 'invalid_token', 'Tu sesión expiró. Vuelve a iniciar sesión.'));
    }
  };
}

export const requireUser: RequestHandler = (req, _res, next) => {
  if (!req.user) return next(new HttpError(401, 'unauthenticated', 'Debes iniciar sesión.'));
  next();
};

export const requireAdmin: RequestHandler = (req, _res, next) => {
  if (!req.user) return next(new HttpError(401, 'unauthenticated', 'Debes iniciar sesión.'));
  if (!req.user.isAdmin) return next(new HttpError(403, 'forbidden', 'No tienes permisos de administrador.'));
  next();
};
