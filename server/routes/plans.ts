import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { requireAuth } from '../middleware/auth.js';
import { deletePlan, listPlans, savePlan } from '../services/plans.js';
import type { AppEnv } from '../types.js';
import { PlanDeleteSchema, PlanSchema } from '../validators/plans.js';

const app = new Hono<AppEnv>();
app.use('/plans', requireAuth);

app.get('/plans', async (c) => {
  return c.json(await listPlans(c.get('uid')));
});

app.post('/plans', zValidator('json', PlanSchema), async (c) => {
  await savePlan(c.get('uid'), c.req.valid('json'));
  return c.json({ ok: true });
});

app.delete('/plans', zValidator('json', PlanDeleteSchema), async (c) => {
  await deletePlan(c.get('uid'), c.req.valid('json').id);
  return c.json({ ok: true });
});

export default app;
