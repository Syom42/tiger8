import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { requireAuth } from '../middleware/auth.js';
import { getWeekPlan, saveWeekPlan } from '../services/weekPlan.js';
import type { AppEnv } from '../types.js';
import { WeekPlanSchema } from '../validators/weekPlan.js';

const app = new Hono<AppEnv>();
app.use('/week-plan', requireAuth);

app.get('/week-plan', async (c) => {
  return c.json(await getWeekPlan(c.get('uid')));
});

app.put('/week-plan', zValidator('json', WeekPlanSchema), async (c) => {
  await saveWeekPlan(c.get('uid'), c.req.valid('json'));
  return c.json({ ok: true });
});

export default app;
