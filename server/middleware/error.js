// Central error handler — wires into Hono via `app.onError(onError)`.
// Translates Zod errors → 400, HTTPException → its status, anything else → 500.
import { HTTPException } from 'hono/http-exception';
import { ZodError } from 'zod';

export function onError(err, c) {
  if (err instanceof HTTPException) {
    return c.json({ error: err.message || 'error' }, err.status);
  }
  if (err instanceof ZodError) {
    return c.json({ error: 'invalid input', issues: err.issues }, 400);
  }
  // Postgres unique violation
  if (err && err.code === '23505') {
    return c.json({ error: 'conflict' }, 409);
  }
  console.error('[unhandled]', c.req.method, c.req.path, err);
  return c.json({ error: 'internal server error' }, 500);
}
