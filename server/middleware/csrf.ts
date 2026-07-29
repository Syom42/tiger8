// CSRF defence in depth. The session cookie is SameSite=Lax, which already
// blocks cross-site form posts, but a same-site subdomain takeover or a browser
// quirk would bypass that. Reject any state-changing request whose Origin does
// not match the host we are served from.
import type { MiddlewareHandler } from 'hono';
import { HTTPException } from 'hono/http-exception';
import type { AppEnv } from '../types.js';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

export const verifyOrigin: MiddlewareHandler<AppEnv> = async (c, next) => {
  if (SAFE_METHODS.has(c.req.method)) return next();

  const origin = c.req.header('origin');
  // Non-browser clients (QA scripts, curl) send no Origin — nothing to forge.
  if (!origin) return next();

  const host = c.req.header('host');
  let originHost: string | null = null;
  try {
    originHost = new URL(origin).host;
  } catch {
    originHost = null;
  }

  if (!originHost || !host || originHost !== host) {
    throw new HTTPException(403, { message: 'invalid origin' });
  }

  await next();
};
