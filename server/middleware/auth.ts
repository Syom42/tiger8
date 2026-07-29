// Auth middleware. Use as `app.get('/x', requireAuth, handler)`.
// After it runs, `c.get('uid')` and `c.get('email')` are set.
import type { MiddlewareHandler } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { readSession } from '../lib/session.js';
import type { AppEnv } from '../types.js';

export const requireAuth: MiddlewareHandler<AppEnv> = async (c, next) => {
  const session = await readSession(c);
  if (!session) throw new HTTPException(401, { message: 'unauthorized' });
  // Coerce to number — old JWTs stored uid as a string because
  // @vercel/postgres returns bigint columns as strings.
  c.set('uid', Number(session.uid));
  c.set('email', session.email);
  await next();
};
