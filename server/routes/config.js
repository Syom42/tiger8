// Public, no-auth endpoint exposing safe Neon Auth display config.
import { Hono } from 'hono';
import { env } from '../env.js';

const app = new Hono();

app.get('/config', (c) => {
  const e = env();
  const baseUrl = e.NEON_AUTH_BASE_URL;
  const stackProjectId = baseUrl.split('/projects/')[1]?.split('/')[0] ?? '';
  return c.json({
    authBaseUrl: baseUrl,
    stackProjectId,
    stackPublishableClientKey: e.STACK_PUBLISHABLE_CLIENT_KEY,
  });
});

export default app;
