import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { requireAuth } from '../middleware/auth.js';
import { getPersonalRecords, savePersonalRecords } from '../services/prs.js';
import type { AppEnv } from '../types.js';
import { PrsSchema } from '../validators/prs.js';

const app = new Hono<AppEnv>();
app.use('/prs', requireAuth);

app.get('/prs', async (c) => {
  return c.json(await getPersonalRecords(c.get('uid')));
});

app.put('/prs', zValidator('json', PrsSchema), async (c) => {
  await savePersonalRecords(c.get('uid'), c.req.valid('json'));
  return c.json({ ok: true });
});

export default app;
