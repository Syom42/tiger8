import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { requireAuth } from '../middleware/auth.js';
import { addWeight, deleteWeight, listWeight } from '../services/weight.js';
import type { AppEnv } from '../types.js';
import { WeightCreateSchema, WeightDeleteSchema } from '../validators/weight.js';

const app = new Hono<AppEnv>();
app.use('/weight', requireAuth);

app.get('/weight', async (c) => {
  return c.json(await listWeight(c.get('uid')));
});

app.post('/weight', zValidator('json', WeightCreateSchema), async (c) => {
  const id = await addWeight(c.get('uid'), c.req.valid('json'));
  return c.json({ ok: true, id });
});

app.delete('/weight', zValidator('json', WeightDeleteSchema), async (c) => {
  await deleteWeight(c.get('uid'), c.req.valid('json').id);
  return c.json({ ok: true });
});

export default app;
