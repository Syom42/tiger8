import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { requireAuth } from '../middleware/auth.js';
import { getProfile, saveProfile } from '../services/profile.js';
import type { AppEnv } from '../types.js';
import { ProfileSchema } from '../validators/profile.js';

const app = new Hono<AppEnv>();
app.use('/profile', requireAuth);

app.get('/profile', async (c) => {
  return c.json(await getProfile(c.get('uid'), c.get('email')));
});

app.put('/profile', zValidator('json', ProfileSchema), async (c) => {
  await saveProfile(c.get('uid'), c.req.valid('json'));
  return c.json({ ok: true });
});

export default app;
