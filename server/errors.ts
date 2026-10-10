import type { ErrorRequestHandler, NextFunction, Request, RequestHandler, Response } from 'express';
import { ZodError } from 'zod';
import type { ApiErrorBody } from '../shared/types';

export class HttpError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}

export const notFound = (what: string) => new HttpError(404, 'not_found', `${what} no encontrada.`);

/** Envuelve un handler async para que sus errores lleguen al manejador central. */
export const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>): RequestHandler =>
  (req, res, next) => {
    fn(req, res, next).catch(next);
  };

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  let body: ApiErrorBody;
  let status: number;

  if (err instanceof HttpError) {
    status = err.status;
    body = { error: err.code, message: err.message, details: err.details };
  } else if (err instanceof ZodError) {
    status = 400;
    body = {
      error: 'validation_error',
      message: err.issues[0]?.message ?? 'Datos inválidos.',
      details: err.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
    };
  } else if (err?.type === 'entity.too.large' || err?.code === 'LIMIT_FILE_SIZE') {
    status = 413;
    body = { error: 'too_large', message: 'El archivo o la solicitud es demasiado grande.' };
  } else if (err?.type === 'entity.parse.failed') {
    status = 400;
    body = { error: 'invalid_json', message: 'El cuerpo de la solicitud no es JSON válido.' };
  } else {
    console.error(err);
    status = 500;
    body = { error: 'internal_error', message: 'Ocurrió un error inesperado. Inténtalo de nuevo.' };
  }

  res.status(status).json(body);
};
