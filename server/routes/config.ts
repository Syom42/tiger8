// Public, no-auth endpoint exposing safe Neon Auth display config.
import { Hono } from 'hono';
import { env } from '../config/env.js';
import type { AppEnv } from '../types.js';

const app = new Hono<AppEnv>();

function extractStackProjectId(baseUrl: string): string {
  const marker = '/projects/';
  const index = baseUrl.indexOf(marker);
  if (index === -1) return '';
  return baseUrl.slice(index + marker.length).split('/')[0];
}

app.get('/config', (c) => {
  const current = env();
  return c.json({
    authBaseUrl: current.NEON_AUTH_BASE_URL,
    stackProjectId: extractStackProjectId(current.NEON_AUTH_BASE_URL),
    stackPublishableClientKey: current.STACK_PUBLISHABLE_CLIENT_KEY,
  });
});

export default app;
