// Central error handler — wires into Hono via `app.onError(onError)`.
// Translates Zod errors → 400, HTTPException → its status, anything else → 500.
import type { ErrorHandler } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { ZodError } from 'zod';
import { isUniqueViolation } from '../db/errors.js';
import type { AppEnv } from '../types.js';

export const onError: ErrorHandler<AppEnv> = (err, c) => {
  if (err instanceof HTTPException) {
    return c.json({ error: err.message || 'error' }, err.status);
  }
  if (err instanceof ZodError) {
    return c.json({ error: 'invalid input', issues: err.issues }, 400);
  }
  if (isUniqueViolation(err)) {
    return c.json({ error: 'conflict' }, 409);
  }
  console.error('[unhandled]', c.req.method, c.req.path, err);
  return c.json({ error: 'internal server error' }, 500);
};
