import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { requireAuth } from '../middleware/auth.js';
import {
  deleteSupplement, listSupplements, setSupplementTaken, upsertSupplement,
} from '../services/supplements.js';
import type { AppEnv } from '../types.js';
import {
  SupplementDeleteSchema, SupplementTakenSchema, SupplementUpsertSchema,
} from '../validators/supplements.js';

const app = new Hono<AppEnv>();
app.use('/supplements', requireAuth);

app.get('/supplements', async (c) => {
  return c.json(await listSupplements(c.get('uid')));
});

app.post('/supplements', zValidator('json', SupplementUpsertSchema), async (c) => {
  const id = await upsertSupplement(c.get('uid'), c.req.valid('json'));
  return c.json({ ok: true, id });
});

app.put('/supplements', zValidator('json', SupplementTakenSchema), async (c) => {
  await setSupplementTaken(c.get('uid'), c.req.valid('json'));
  return c.json({ ok: true });
});

app.delete('/supplements', zValidator('json', SupplementDeleteSchema), async (c) => {
  await deleteSupplement(c.get('uid'), c.req.valid('json').id);
  return c.json({ ok: true });
});

export default app;
