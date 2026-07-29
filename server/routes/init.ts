import { Hono } from 'hono';
import { requireAuth } from '../middleware/auth.js';
import { loadBootstrap } from '../services/init.js';
import type { AppEnv } from '../types.js';

const app = new Hono<AppEnv>();

app.get('/init', requireAuth, async (c) => {
  return c.json(await loadBootstrap(c.get('uid'), c.get('email')));
});

export default app;
